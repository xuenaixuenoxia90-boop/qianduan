# 军队学员人员在线管理系统 - 后端 API 文档

> 供前端开发工程师参考，基于 Cloudflare Workers + Hono.js 构建

---

## 基础信息

- **Base URL**: `https://backroom.your-domain.com`（部署后的实际域名）
- **认证方式**: JWT Bearer Token
- **响应格式**: 统一 JSON `{ success: boolean, data?: any, error?: string }`
- **CORS**: 已开启，支持跨域请求
- **速率限制**: 60秒内最多100次请求

---

## 认证模块

### POST /api/auth/login

用户登录，返回 JWT 令牌。

**请求体**:
```json
{
  "name": "张三",
  "password": "123456"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "张三",
      "position": "连长",
      "platoon": 1,
      "squad": 1,
      "role": "admin",
      "situation_code": "01001",
      "last_updated": "2025-06-20T12:00:00.000Z"
    }
  }
}
```

**失败响应** (401):
```json
{
  "success": false,
  "error": "用户名或密码错误"
}
```

**前端用法**:
```javascript
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, password })
});
const { data } = await res.json();
// 保存 token
localStorage.setItem('token', data.token);
// 后续请求携带
fetch('/api/users', {
  headers: { 'Authorization': `Bearer ${data.token}` }
});
```

---

## 人员管理模块

### GET /api/users

获取用户列表，支持筛选。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| platoon | number | 排号（1-3） |
| squad | number | 班号（1-6） |
| date | string | 日期 YYYY-MM-DD，附带当日状态 |

**请求示例**:
```
GET /api/users?platoon=1&squad=1&date=2025-06-20
```

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "孙七",
      "position": "班长",
      "platoon": 1,
      "squad": 1,
      "role": "user",
      "situation_code": "01005",
      "last_updated": "2025-06-20T12:00:00.000Z",
      "status": {
        "id": 1,
        "date": "2025-06-20",
        "user_id": 5,
        "status_code": 0,
        "remark": null,
        "location": "营区",
        "created_at": "2025-06-20T08:00:00.000Z",
        "updated_at": "2025-06-20T08:00:00.000Z"
      }
    }
  ]
}
```

**权限说明**:
- 学员：只能看到自己
- 班长：只能看到本班
- 排长：只能看到本排
- 连长/admin：可看全连，支持筛选

---

### GET /api/company/overview

获取连级统计概览，用于首页色块表格展示。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 YYYY-MM-DD，默认今天 |

**请求示例**:
```
GET /api/company/overview?date=2025-06-20
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "total": 200,
    "present": 180,
    "onLeave": 10,
    "onDuty": 5,
    "out": 3,
    "hospitalized": 0,
    "other": 2,
    "platoons": [
      {
        "id": 1,
        "total": 67,
        "present": 60,
        "squads": [
          { "id": 1, "total": 12, "present": 10 },
          { "id": 2, "total": 11, "present": 10 },
          { "id": 3, "total": 11, "present": 10 },
          { "id": 4, "total": 11, "present": 10 },
          { "id": 5, "total": 11, "present": 10 },
          { "id": 6, "total": 11, "present": 10 }
        ]
      },
      { "id": 2, "total": 67, "present": 60, "squads": [...] },
      { "id": 3, "total": 66, "present": 60, "squads": [...] }
    ]
  }
}
```

**前端用法**: 用于渲染连-排-班三级色块矩阵图，`present/total` 比例决定颜色深浅。

---

### GET /api/platoon/:id

获取排级详情，按班分组展示人员。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 YYYY-MM-DD |

**请求示例**:
```
GET /api/platoon/1?date=2025-06-20
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "platoon": 1,
    "date": "2025-06-20",
    "squads": [
      {
        "id": 1,
        "users": [
          {
            "id": 5,
            "name": "孙七",
            "position": "班长",
            "platoon": 1,
            "squad": 1,
            "role": "user",
            "situation_code": "01005",
            "last_updated": "2025-06-20T12:00:00.000Z",
            "status": {
              "status_code": 0,
              "remark": null,
              "location": "营区"
            }
          }
        ]
      }
    ]
  }
}
```

---

### GET /api/squad/:id

获取班级详情。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 YYYY-MM-DD |
| platoon | number | 排号（可选，用于区分同名班级） |

**请求示例**:
```
GET /api/squad/1?platoon=1&date=2025-06-20
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "squad": 1,
    "date": "2025-06-20",
    "users": [
      {
        "id": 5,
        "name": "孙七",
        "position": "班长",
        "platoon": 1,
        "squad": 1,
        "role": "user",
        "status": {
          "status_code": 0,
          "remark": null,
          "location": "营区"
        }
      }
    ]
  }
}
```

---

## 状态更新模块

### POST /api/users/:id/status

更新单个用户的在位状态。

**请求体**:
```json
{
  "status_code": 0,
  "remark": "在位",
  "location": "营区",
  "date": "2025-06-20"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status_code | number (0-5) | 是 | 0=在位, 1=请假, 2=公差, 3=外出, 4=住院, 5=其他 |
| remark | string | 否 | 备注说明 |
| location | string | 否 | 当前位置 |
| date | string | 否 | 日期，默认今天 |

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "date": "2025-06-20",
    "status_code": 0,
    "remark": "在位",
    "location": "营区"
  }
}
```

---

### POST /api/users/batch/status

批量更新多个用户状态（最多50条）。

**请求体**:
```json
{
  "updates": [
    { "user_id": 5, "status_code": 0, "remark": "在位", "location": "营区" },
    { "user_id": 6, "status_code": 1, "remark": "回家", "location": null },
    { "user_id": 7, "status_code": 2, "remark": "帮厨", "location": "食堂" }
  ],
  "date": "2025-06-20"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "success_count": 3,
    "error_count": 0,
    "results": [
      { "user_id": 5, "status_code": 0, "date": "2025-06-20" },
      { "user_id": 6, "status_code": 1, "date": "2025-06-20" },
      { "user_id": 7, "status_code": 2, "date": "2025-06-20" }
    ],
    "errors": []
  }
}
```

---

## 报告/报备模块

### POST /api/reports/leave

提交请假申请。

**请求体**:
```json
{
  "start_time": "2025-06-21T08:00:00",
  "end_time": "2025-06-23T18:00:00",
  "reason": "回家探亲",
  "user_id": 5
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| start_time | string | 是 | 开始时间 |
| end_time | string | 是 | 结束时间 |
| reason | string | 是 | 请假原因 |
| user_id | number | 否 | 代他人提交，默认自己 |

---

### POST /api/reports/duty

提交公差申请。

**请求体**:
```json
{
  "start_time": "2025-06-21T08:00:00",
  "end_time": "2025-06-21T18:00:00",
  "reason": "外出采购物资",
  "user_id": 5
}
```

---

### GET /api/reports

获取报告列表。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 类型筛选：leave/duty/other |
| status | string | 状态筛选：pending/approved/rejected |
| user_id | number | 指定用户 |

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "type": "leave",
      "start_time": "2025-06-21T08:00:00",
      "end_time": "2025-06-23T18:00:00",
      "reason": "回家探亲",
      "status": "pending",
      "approver_id": null,
      "created_at": "2025-06-20T10:00:00.000Z",
      "updated_at": "2025-06-20T10:00:00.000Z"
    }
  ]
}
```

---

### PUT /api/reports/:id/approve

审批报告（仅连长/排长/班长可用）。

**请求体**:
```json
{
  "status": "approved"
}
```

`status` 可选值：`"approved"` 或 `"rejected"`

---

## 命令与通知模块

### POST /api/commands

发布命令（仅连长/排长/班长可用）。

**请求体**:
```json
{
  "title": "紧急集合通知",
  "content": "全体人员于明日0600时在操场集合",
  "priority": "urgent",
  "target_platoon": 1,
  "target_squad": null
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 命令标题 |
| content | string | 是 | 命令内容 |
| priority | string | 否 | 优先级：normal/urgent/critical，默认 normal |
| target_platoon | number | 否 | 目标排，不填则全连 |
| target_squad | number | 否 | 目标班，不填则全排/全连 |

**权限限制**:
- 班长只能向本班发布
- 排长只能向本排发布
- 连长可向全连发布

---

### GET /api/commands

获取命令列表。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| priority | string | 优先级筛选：normal/urgent/critical |
| limit | number | 返回数量，默认50，最大100 |

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "紧急集合通知",
      "content": "全体人员于明日0600时在操场集合",
      "priority": "urgent",
      "issuer_id": 1,
      "target_platoon": 1,
      "target_squad": null,
      "created_at": "2025-06-20T10:00:00.000Z",
      "issuer": {
        "id": 1,
        "name": "张三",
        "position": "连长"
      }
    }
  ]
}
```

---

### GET /api/commands/:id

获取单个命令详情。

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "紧急集合通知",
    "content": "全体人员于明日0600时在操场集合",
    "priority": "urgent",
    "issuer_id": 1,
    "target_platoon": 1,
    "target_squad": null,
    "created_at": "2025-06-20T10:00:00.000Z",
    "issuer": {
      "id": 1,
      "name": "张三",
      "position": "连长"
    }
  }
}
```

---

## 日历排班模块

### GET /api/schedules

获取排班列表。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 指定日期 YYYY-MM-DD |
| start_date | string | 日期范围开始 |
| end_date | string | 日期范围结束 |
| user_id | number | 指定用户 |
| task_type | string | 任务类型筛选 |

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-06-21",
      "user_id": 5,
      "task_type": "值班",
      "start_time": "08:00",
      "end_time": "20:00",
      "remark": "一号岗",
      "created_at": "2025-06-20T10:00:00.000Z",
      "user": {
        "id": 5,
        "name": "孙七",
        "platoon": 1,
        "squad": 1
      }
    }
  ]
}
```

---

### POST /api/schedules

创建排班。

**请求体**:
```json
{
  "date": "2025-06-21",
  "user_id": 5,
  "task_type": "值班",
  "start_time": "08:00",
  "end_time": "20:00",
  "remark": "一号岗"
}
```

---

### PUT /api/schedules/:id

更新排班。

**请求体**（所有字段可选）:
```json
{
  "date": "2025-06-22",
  "task_type": "站岗",
  "start_time": "06:00",
  "end_time": "18:00",
  "remark": "二号岗"
}
```

---

### DELETE /api/schedules/:id

删除排班。

**成功响应** (200):
```json
{
  "success": true,
  "data": { "id": 1 }
}
```

---

## 状态码对照表

| status_code | 含义 | 建议前端颜色 |
|-------------|------|-------------|
| 0 | 在位 | 绿色 |
| 1 | 请假 | 黄色 |
| 2 | 公差 | 蓝色 |
| 3 | 外出 | 橙色 |
| 4 | 住院 | 红色 |
| 5 | 其他 | 灰色 |

---

## 角色权限矩阵

| 功能 | 连长(admin) | 排长 | 班长 | 学员 |
|------|:-----------:|:----:|:----:|:----:|
| 查看全连人员 | ✅ | ❌ | ❌ | ❌ |
| 查看本排人员 | ✅ | ✅ | ❌ | ❌ |
| 查看本班人员 | ✅ | ✅ | ✅ | ❌ |
| 查看自己 | ✅ | ✅ | ✅ | ✅ |
| 修改全连状态 | ✅ |  | ❌ | ❌ |
| 修改本排状态 | ✅ | ✅ | ❌ |  |
| 修改本班状态 | ✅ | ✅ | ✅ | ❌ |
| 修改自己状态 | ✅ | ✅ | ✅ | ✅ |
| 发布命令 | ✅ | ✅(本排) | ✅(本班) | ❌ |
| 审批报告 | ✅ | ✅ | ✅ |  |
| 提交请假/公差 | ✅ | ✅ | ✅ | ✅ |
| 管理排班 | ✅ | ✅ | ✅ | ❌ |

---

## JWT Payload 结构

前端解码 JWT 后可获取当前用户信息：

```json
{
  "userId": 1,
  "name": "张三",
  "position": "连长",
  "platoon": 1,
  "squad": 1,
  "role": "admin",
  "exp": 1718928000
}
```

---

## 前端请求封装示例

```javascript
const API_BASE = 'https://backroom.your-domain.com/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  async request(method, path, body = null, params = null) {
    const url = new URL(API_BASE + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  // 认证
  login(name, password) {
    return this.request('POST', '/auth/login', { name, password });
  }

  // 人员
  getUsers(params) { return this.request('GET', '/users', null, params); }
  getOverview(date) { return this.request('GET', '/company/overview', null, { date }); }
  getPlatoon(id, date) { return this.request('GET', `/platoon/${id}`, null, { date }); }
  getSquad(id, params) { return this.request('GET', `/squad/${id}`, null, params); }

  // 状态
  updateStatus(userId, body) { return this.request('POST', `/users/${userId}/status`, body); }
  batchUpdateStatus(body) { return this.request('POST', '/users/batch/status', body); }

  // 报告
  submitLeave(body) { return this.request('POST', '/reports/leave', body); }
  submitDuty(body) { return this.request('POST', '/reports/duty', body); }
  getReports(params) { return this.request('GET', '/reports', null, params); }
  approveReport(id, status) { return this.request('PUT', `/reports/${id}/approve`, { status }); }

  // 命令
  createCommand(body) { return this.request('POST', '/commands', body); }
  getCommands(params) { return this.request('GET', '/commands', null, params); }
  getCommand(id) { return this.request('GET', `/commands/${id}`); }

  // 排班
  getSchedules(params) { return this.request('GET', '/schedules', null, params); }
  createSchedule(body) { return this.request('POST', '/schedules', body); }
  updateSchedule(id, body) { return this.request('PUT', `/schedules/${id}`, body); }
  deleteSchedule(id) { return this.request('DELETE', `/schedules/${id}`); }
}

export default new ApiClient();
```

---

## 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或令牌无效/过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
