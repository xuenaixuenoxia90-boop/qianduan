# 人员在线管理系统 - 前后端 API 契约文件

> 版本：1.0
> 日期：2026-06-24
> 基础路径：`/api`

---

## 一、全局约定

### 1.1 通信协议
- 协议：HTTP / HTTPS
- 数据格式：JSON
- 编码：UTF-8
- 认证方式：Bearer Token（通过 `Authorization` 请求头传递）

### 1.2 通用请求头
```
Content-Type: application/json
Authorization: Bearer <token>
```

### 1.3 通用响应格式

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**失败响应：**
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

### 1.4 通用状态码

| HTTP 状态码 | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 二、权限体系

### 2.1 角色定义

| 角色值 | 名称 | 说明 |
|---|---|---|
| 0 | 队长 | 最高权限，可看全连，发布紧急命令 |
| 1 | 连干 | 可看全连，发布查人/公差命令给排级 |
| 2 | 排干 | 可看本排，发布查人/公差命令给班级 |
| 3 | 班长 | 可看本班，修改本班人员状态，发布报人/公差命令 |
| 4 | 卫生员 | 与班员同级，报病号时有特殊选项 |
| 5 | 班员 | 只能看本班，使用报告/说一说功能 |

### 2.2 权限层级
```
0（队长）> 1（连干）> 2（排干）> 3（班长）> 4（卫生员）= 5（班员）
```
**4 和 5 同级。**

### 2.3 值班状态提升
| 原角色 | 值班后等效角色 | 可见范围 |
|---|---|---|
| 3（班长）值班 | 2（排干级别） | 可看本排所有人员 |
| 2（排干）值班 | 1（连干级别） | 可看全连所有人员 |
| 1（连干）值班 | 1（不变） | 可看全连 |

### 2.4 命令下发方向
| 操作者 | 命令 | 目标 |
|---|---|---|
| 队长(0) | 查人 | → 连干(1) |
| 连干(1) | 查人 | → 排干(2) |
| 排干(2) | 查人 | → 班长(3) |
| 班长(3) | 查人 | → 班员(4/5) |
| 连干(1) | 发布公差 | → 排干(2) |
| 排干(2) | 发布公差 | → 班长(3) |
| 班长(3) | 发布公差 | → 班员(4/5) |
| 班长(3) | 报人 | → 排干(2) |
| 队长(0) | 紧急命令 | → 所有人 |

### 2.5 人员状态修改权限
| 角色 | 可修改范围 |
|---|---|
| 0（队长） | 全连任意人员 |
| 1（连干） | 全连任意人员 |
| 2（排干） | 本排任意人员 |
| 值班班长(等效2) | 本排任意人员 |
| 3（班长） | 仅本班人员 |
| 4/5（卫生员/班员） | 不可修改 |

---

## 三、编制结构

系统以 **连 → 排 → 班 → 人员** 四级编制组织：
- 1 个连包含 N 个排（默认 4 个）
- 1 个排包含 N 个班（默认 3~5 个）
- 1 个班包含 N 个人员（默认 10~15 人）

---

## 四、API 接口详细定义

### 4.1 用户认证

#### POST `/api/auth/login` - 登录

**请求体：**
```json
{
  "role": 3,        // int, 必填, 角色值 0-5
  "platoon": 2,     // int, 必填, 排号 1-N
  "squad": 1        // int, 必填, 班号 1-N
}
```

**响应：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userId": 123,
    "role": 3,
    "platoon": 2,
    "squad": 1,
    "name": "张三"
  }
}
```

---

#### GET `/api/auth/me` - 获取当前用户信息

**请求头：** `Authorization: Bearer <token>`

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": 123,
    "name": "张三",
    "role": 3,
    "platoon": 2,
    "squad": 1,
    "onDuty": 0
  }
}
```

---

#### POST `/api/auth/logout` - 登出

**请求头：** `Authorization: Bearer <token>`

**响应：**
```json
{
  "code": 200,
  "message": "已登出",
  "data": null
}
```

---

### 4.2 人员状态

#### GET `/api/personnel` - 获取人员列表

根据当前用户权限返回对应范围的人员数据。

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| platoon | int | 否 | 排号，不传则按权限返回 |
| squad | int | 否 | 班号，不传则按权限返回 |

**权限范围：**
- 角色 0/1：返回全连所有人员
- 角色 2 / 值班班长(等效2)：返回本排所有人员
- 角色 3：返回本班所有人员
- 角色 4/5：返回本班所有人员

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "1": {
      "name": "一排",
      "squads": {
        "1": [
          {
            "id": 1,
            "name": "张伟",
            "status": 0,
            "remark": ""
          }
        ],
        "2": [ ... ]
      }
    },
    "2": { ... }
  }
}
```

**人员状态值：**
| 值 | 含义 |
|---|---|
| 0 | 正常（操课/训练/自习） |
| 1 | 俱乐部/竞赛 |
| 2 | 公差/勤务/办公 |
| 3 | 病号/请假/外出 |
| 4 | 岗哨 |
| 5 | 其他 |

---

#### PUT `/api/personnel/{personId}/status` - 修改人员状态

**路径参数：**
| 参数 | 类型 | 说明 |
|---|---|---|
| personId | int | 人员 ID |

**请求体：**
```json
{
  "status": 2    // int, 必填, 目标状态 0-5
}
```

**权限校验：**
- 后端需校验当前用户是否有权限修改该人员
- 角色 0/1 可修改全连；角色 2 可修改本排；角色 3 仅可修改本班
- 无权限返回 403

**响应：**
```json
{
  "code": 200,
  "message": "状态已更新",
  "data": {
    "id": 1,
    "name": "张伟",
    "status": 2,
    "remark": ""
  }
}
```

---

#### PUT `/api/personnel/batch-status` - 批量修改人员状态

**请求体：**
```json
{
  "personIds": [1, 2, 3],   // int[], 必填
  "status": 2                // int, 必填, 目标状态 0-5
}
```

**响应：**
```json
{
  "code": 200,
  "message": "已批量更新",
  "data": {
    "updated": 3
  }
}
```

---

### 4.3 查人功能

#### POST `/api/commands/check` - 发布查人命令

上级向下级发布查人命令，要求下级上报人员在位情况。

**请求体：**
```json
{
  "targetRole": 2,     // int, 必填, 目标接收角色级别
  "remark": "立即上报"  // string, 选填, 备注信息
}
```

**命令流向：**
| 发布者角色 | targetRole | 接收者 |
|---|---|---|
| 0（队长） | 1 | 连干 |
| 1（连干） | 2 | 排干 |
| 2（排干） | 3 | 班长 |
| 3（班长） | 4 | 班员 |

**后端行为：**
1. 创建查人通知，推送给所有 `role == targetRole` 的在线用户
2. 记录命令来源、时间、备注

**响应：**
```json
{
  "code": 200,
  "message": "查人命令已发布",
  "data": {
    "commandId": 456
  }
}
```

---

#### GET `/api/notifications/check` - 获取查人通知列表

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "fromRole": 0,
      "fromName": "队长",
      "remark": "立即上报人员在位情况",
      "createdAt": "2026-06-24T10:30:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/check/{notificationId}/read` - 标记查人通知已读

**响应：**
```json
{
  "code": 200,`n  "message": "已标记为已读",`n  "data": null`n}
```

---

### 4.4 报人功能

#### POST `/api/reports/person` - 提交报人信息

班长向排级上报本班人员情况。

**请求体：**
```json
{
  "platoon": 2,       // int, 必填, 排号
  "squad": 1,         // int, 必填, 班号
  "data": {
    "type": "sick",          // string, 报告类型: sick/club/outing/other/lagang
    // ---- sick 类型 ----
    "year": "2026",
    "month": "6",
    "day": "24",
    "hour": "10",
    "location": "卫生队",
    "illness": "感冒发烧",
    // ---- club 类型 ----
    "startYear": "2026", "startMonth": "6", "startDay": "24", "startHour": "14",
    "endYear": "2026", "endMonth": "6", "endDay": "24", "endHour": "17",
    "location": "俱乐部",
    "clubName": "编程兴趣小组",
    // ---- outing 类型 ----
    "year": "2026", "month": "6", "day": "24", "hour": "8",
    "location": "市区",
    "companion": "李四",
    // ---- other 类型 ----
    "remark": "其他情况说明",
    // ---- lagang 类型 ----
    // 无额外字段
  }
}
```

**后端行为：**
1. 记录报人数据
2. 向本排排干（role=2）和值班班长（等效role=2）发送通知

**响应：**
```json
{
  "code": 200,
  "message": "报人已提交",
  "data": {
    "reportId": 789
  }
}
```

---

#### GET `/api/notifications/report` - 获取报人通知列表

排长/值班班长收到的报人通知。

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "platoon": 2,
      "squad": 1,
      "reporterName": "张三",
      "type": "sick",
      "summary": "报病号",
      "createdAt": "2026-06-24T10:30:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/report/{notificationId}` - 处理报人通知

**请求体：**
```json
{
  "action": "approve",    // string, 必填: "approve" | "reject" | "acknowledge"
  "remark": "收到"         // string, 选填, 驳回时必填驳回原因
}
```

**action 说明：**
| 值 | 含义 | 后续行为 |
|---|---|---|
| approve | 同意 | 通知班长已通过 |
| reject | 驳回 | 通知班长被驳回，需重新上报 |
| acknowledge | 知道了 | 仅标记已读 |

**响应：**
```json
{
  "code": 200,`n  "message": "已处理",`n  "data": null`n}
```

---

#### GET `/api/notifications/report/{notificationId}` - 获取报人详情

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "id": 789,
    "platoon": 2,
    "squad": 1,
    "reporterName": "张三",
    "data": {
      "type": "sick",
      "year": "2026",
      "month": "6",
      "day": "24",
      "hour": "10",
      "location": "卫生队",
      "illness": "感冒发烧"
    },
    "createdAt": "2026-06-24T10:30:00Z"
  }
}
```

---

#### GET `/api/notifications/rejection` - 获取驳回通知

班长收到自己提交的报人被驳回的通知。

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "reportId": 789,
      "reason": "数据有误，请重新上报",
      "rejectorName": "二排长",
      "createdAt": "2026-06-24T11:00:00Z",
      "isRead": false
    }
  ]
}
```

---

### 4.5 发布公差

#### POST `/api/commands/duty` - 发布公差命令

上级向下级发布公差安排。

**请求体：**
```json
{
  "targetRole": 3,              // int, 必填, 目标接收角色级别
  "dutyTypes": ["打扫卫生", "搬运物资"],  // string[], 必填, 公差类型列表
  "remark": "下午两点开始"       // string, 选填, 备注
}
```

**命令流向：**
| 发布者角色 | targetRole | 接收者 |
|---|---|---|
| 1（连干） | 2 | 排干 |
| 2（排干） | 3 | 班长 |
| 3（班长） | 4 | 班员 |

**响应：**
```json
{
  "code": 200,
  "message": "公差命令已发布",
  "data": {
    "commandId": 101
  }
}
```

---

#### GET `/api/notifications/duty` - 获取公差通知列表

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "fromRole": 2,
      "fromName": "二排长",
      "dutyTypes": ["打扫卫生", "搬运物资"],
      "remark": "下午两点开始",
      "createdAt": "2026-06-24T13:00:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/duty/{notificationId}/read` - 标记公差通知已读

**响应：**
```json
{
  "code": 200,`n  "message": "已标记为已读",`n  "data": null`n}
```

---

### 4.6 紧急命令

#### POST `/api/commands/emergency` - 发布紧急命令

仅队长（role=0）可发布，面向所有人。

**请求体：**
```json
{
  "remark": "全体集合，紧急任务！"   // string, 必填, 命令内容
}
```

**权限校验：**
- 仅 role=0 可调用，否则返回 403

**后端行为：**
- 向所有在线用户推送紧急通知

**响应：**
```json
{
  "code": 200,
  "message": "紧急命令已发送",
  "data": {
    "commandId": 201
  }
}
```

---

#### GET `/api/notifications/emergency` - 获取紧急命令通知

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "content": "全体集合，紧急任务！",
      "fromName": "队长",
      "createdAt": "2026-06-24T15:00:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/emergency/{notificationId}/read` - 标记紧急命令已读

**响应：**
```json
{
  "code": 200,`n  "message": "已标记为已读",`n  "data": null`n}
```

---

### 4.7 说一说（留言板）

#### POST `/api/messages` - 发布留言

**请求体：**
```json
{
  "content": "今天天气不错"   // string, 必填, 留言内容
}
```

**响应：**
```json
{
  "code": 200,
  "message": "发布成功",
  "data": {
    "messageId": 301
  }
}
```

---

#### GET `/api/messages` - 获取留言列表

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页条数，默认 20 |

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": 301,
        "userId": 123,
        "userName": "张三",
        "content": "今天天气不错",
        "createdAt": "2026-06-24T10:30:00Z"
      }
    ]
  }
}
```

---

#### DELETE `/api/messages/{messageId}` - 删除留言

**权限校验：**
- 仅留言本人或管理员（role=0）可删除

**响应：**
```json
{
  "code": 200,`n  "message": "已删除",`n  "data": null`n}
```

---

### 4.8 排岗功能

#### POST `/api/guard/schedule` - 保存排岗安排

**请求体：**
```json
{
  "guardType": "day",           // string, 必填: "day"(白岗) | "night"(夜岗)
  "assignments": [
    {
      "personId": 1,            // int, 必填, 人员 ID
      "cycle": 1,               // int, 必填, 轮次（第几轮）
      "order": 1                // int, 必填, 该轮中的顺序
    }
  ]
}
```

**响应：**
```json
{
  "code": 200,
  "message": "排岗已保存",
  "data": {
    "scheduleId": 401
  }
}
```

---

#### GET `/api/guard/schedule` - 获取排岗安排

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| type | string | 必填 | "day" 或 "night" |

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "guardType": "day",
    "assignments": [
      {
        "personId": 1,
        "personName": "张伟",
        "platoon": 2,
        "squad": 1,
        "cycle": 1,
        "order": 1
      }
    ]
  }
}
```

---

#### POST `/api/guard/confirm` - 确认排岗

确认后排岗生效，通知相关人员及其班长。

**请求体：**
```json
{
  "guardType": "day",
  "assignments": [
    {
      "personId": 1,
      "cycle": 1,
      "order": 1
    }
  ]
}
```

**后端行为：**
1. 将排岗状态标记为已确认
2. 将被排岗人员的状态改为 4（岗哨）
3. 向被排岗人员发送通知
4. 向相关班长发送通知

**响应：**
```json
{
  "code": 200,
  "message": "排岗已确认",
  "data": {
    "scheduleId": 401
  }
}
```

---

#### GET `/api/notifications/guard` - 获取排岗通知

被排岗人员收到的通知。

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "guardType": "day",
      "cycle": 1,
      "order": 1,
      "confirmedAt": "2026-06-24T18:00:00Z",
      "isRead": false
    }
  ]
}
```

---

#### GET `/api/notifications/squad-guard` - 获取班长排岗通知

班长收到本班人员被排岗的通知。

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "guardType": "day",
      "personId": 1,
      "personName": "张伟",
      "cycle": 1,
      "order": 1,
      "confirmedAt": "2026-06-24T18:00:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/guard/{notificationId}/read` - 标记排岗通知已读

**响应：**
```json
{
  "code": 200,`n  "message": "已标记为已读",`n  "data": null`n}
```

---

### 4.9 值班功能

#### POST `/api/duty/start` - 开始值班

**请求头：** `Authorization: Bearer <token>`

**后端行为：**
1. 将当前用户的值班状态设为 1
2. 根据角色提升等效权限：
   - 班长(3) → 等效排干(2)
   - 排干(2) → 等效连干(1)

**响应：**
```json
{
  "code": 200,
  "message": "已开始值班",
  "data": {
    "onDuty": 1,
    "effectiveRole": 2
  }
}
```

---

#### POST `/api/duty/cancel` - 取消值班

**后端行为：**
1. 将当前用户的值班状态设为 0
2. 恢复原始权限

**响应：**
```json
{
  "code": 200,
  "message": "已取消值班",
  "data": {
    "onDuty": 0,
    "effectiveRole": 3
  }
}
```

---

#### GET `/api/duty/status` - 获取值班状态

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "onDuty": 1,
    "effectiveRole": 2,
    "originalRole": 3,
    "startedAt": "2026-06-24T08:00:00Z"
  }
}
```

---

### 4.10 通知通用接口

#### GET `/api/notifications/unread-count` - 获取未读通知数量

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "count": 5
  }
}
```

---

#### GET `/api/notifications` - 获取所有通知列表

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| type | string | 否 | 通知类型过滤：check/duty/report/emergency/guard |

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": [
    {
      "id": 1,
      "type": "check",
      "content": "...",
      "createdAt": "2026-06-24T10:30:00Z",
      "isRead": false
    }
  ]
}
```

---

#### PUT `/api/notifications/{notificationId}/read` - 标记单条通知已读

**响应：**
```json
{
  "code": 200,`n  "message": "已标记为已读",`n  "data": null`n}
```

---

#### PUT `/api/notifications/read-all` - 标记所有通知已读

**响应：**
```json
{
  "code": 200,
  "message": "已全部标记为已读"
}
```

---

### 4.11 编制信息接口

#### GET `/api/organization/structure` - 获取编制结构

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "companyName": "一连",
    "platoons": [
      {
        "id": 1,
        "name": "一排",
        "squads": [
          { "id": 1, "name": "1班", "personCount": 12 },
          { "id": 2, "name": "2班", "personCount": 11 }
        ]
      }
    ]
  }
}
```

---

#### GET `/api/organization/platoon/{platoonId}` - 获取排级信息

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "id": 2,
    "name": "二排",
    "squadCount": 4,
    "squads": [
      { "id": 1, "name": "1班", "personCount": 12 },
      { "id": 2, "name": "2班", "personCount": 11 }
    ]
  }
}
```

---

#### GET `/api/organization/platoon/{platoonId}/squad/{squadId}` - 获取班级信息

**响应：**
```json
{
  "code": 200,`n  "message": "success",`n  "data": {
    "id": 1,
    "platoonId": 2,
    "name": "1班",
    "personCount": 12,
    "persons": [
      { "id": 1, "name": "张伟", "status": 0 }
    ]
  }
}
```

---

## 五、WebSocket 实时通知

### 5.1 连接地址
```
ws://<host>/ws/notifications?token=<token>
```

### 5.2 消息格式
```json
{
  "type": "check",           // 通知类型
  "id": 1,                   // 通知 ID
  "content": "...",           // 通知内容摘要
  "createdAt": "2026-06-24T10:30:00Z"
}
```

### 5.3 通知类型

| type | 触发场景 | 接收者 |
|---|---|---|
| check | 查人命令发布 | targetRole 对应的用户 |
| duty | 公差命令发布 | targetRole 对应的用户 |
| report | 报人信息提交 | 本排排干 / 值班班长 |
| rejection | 报人被驳回 | 提交报人的班长 |
| emergency | 紧急命令发布 | 所有在线用户 |
| guard | 排岗确认 | 被排岗的人员 |
| squad-guard | 排岗确认 | 被排岗人员的班长 |

---

## 六、数据库建议表结构

### 6.1 users - 用户表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 用户 ID |
| name | VARCHAR(50) | 姓名 |
| role | TINYINT | 角色 0-5 |
| platoon | TINYINT | 排号 |
| squad | TINYINT | 班号 |
| on_duty | TINYINT DEFAULT 0 | 值班状态 0/1 |
| token | VARCHAR(255) | 认证 Token |
| created_at | DATETIME | 创建时间 |

### 6.2 personnel - 人员在线状态表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 人员 ID |
| user_id | INT FK | 关联用户 |
| name | VARCHAR(50) | 姓名 |
| platoon | TINYINT | 排号 |
| squad | TINYINT | 班号 |
| status | TINYINT | 状态 0-5 |
| remark | VARCHAR(200) | 备注 |
| updated_at | DATETIME | 最后更新时间 |

### 6.3 commands - 命令表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 命令 ID |
| type | VARCHAR(20) | 类型: check/duty/emergency |
| from_user_id | INT FK | 发布者 |
| target_role | TINYINT | 目标角色 |
| remark | VARCHAR(500) | 备注/内容 |
| duty_types | JSON | 公差类型数组（仅 duty） |
| created_at | DATETIME | 创建时间 |

### 6.4 notifications - 通知表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 通知 ID |
| type | VARCHAR(20) | 类型: check/duty/report/rejection/emergency/guard/squad-guard |
| user_id | INT FK | 接收用户 |
| command_id | INT FK | 关联命令（可选） |
| report_id | INT FK | 关联报人记录（可选） |
| content | TEXT | 通知内容 |
| is_read | TINYINT DEFAULT 0 | 是否已读 |
| created_at | DATETIME | 创建时间 |

### 6.5 reports - 报人记录表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 记录 ID |
| platoon | TINYINT | 排号 |
| squad | TINYINT | 班号 |
| reporter_id | INT FK | 报告人 |
| report_type | VARCHAR(20) | 类型: sick/club/outing/other/lagang |
| report_data | JSON | 报告详情数据 |
| status | VARCHAR(20) DEFAULT 'pending' | 状态: pending/approved/rejected |
| created_at | DATETIME | 创建时间 |

### 6.6 guard_schedules - 排岗安排表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 排岗 ID |
| guard_type | VARCHAR(10) | day/night |
| person_id | INT FK | 人员 ID |
| cycle | INT | 轮次 |
| order_num | INT | 顺序 |
| confirmed | TINYINT DEFAULT 0 | 是否已确认 |
| created_at | DATETIME | 创建时间 |

### 6.7 messages - 留言板表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 留言 ID |
| user_id | INT FK | 发布用户 |
| content | TEXT | 内容 |
| created_at | DATETIME | 创建时间 |

---

## 七、API 汇总

| 序号 | 方法 | 路径 | 说明 | 调用页面 |
|---|---|---|---|---|
| 1 | POST | /api/auth/login | 登录 | login.html |
| 2 | GET | /api/auth/me | 获取当前用户 | 所有页面 |
| 3 | POST | /api/auth/logout | 登出 | 所有页面 |
| 4 | GET | /api/personnel | 获取人员列表 | index/platoon/squad |
| 5 | PUT | /api/personnel/{id}/status | 修改人员状态 | index/platoon/squad |
| 6 | PUT | /api/personnel/batch-status | 批量修改状态 | - |
| 7 | POST | /api/commands/check | 发布查人命令 | index/platoon/squad |
| 8 | GET | /api/notifications/check | 查人通知列表 | - |
| 9 | PUT | /api/notifications/check/{id}/read | 标记查人已读 | - |
| 10 | POST | /api/reports/person | 提交报人 | squad |
| 11 | GET | /api/notifications/report | 报人通知列表 | - |
| 12 | PUT | /api/notifications/report/{id} | 处理报人通知 | - |
| 13 | GET | /api/notifications/report/{id} | 报人详情 | - |
| 14 | GET | /api/notifications/rejection | 驳回通知 | - |
| 15 | POST | /api/commands/duty | 发布公差命令 | index/platoon/squad |
| 16 | GET | /api/notifications/duty | 公差通知列表 | - |
| 17 | PUT | /api/notifications/duty/{id}/read | 标记公差已读 | - |
| 18 | POST | /api/commands/emergency | 发布紧急命令 | index |
| 19 | GET | /api/notifications/emergency | 紧急命令通知 | - |
| 20 | PUT | /api/notifications/emergency/{id}/read | 标记紧急已读 | - |
| 21 | POST | /api/messages | 发布留言 | squad |
| 22 | GET | /api/messages | 获取留言列表 | squad |
| 23 | DELETE | /api/messages/{id} | 删除留言 | squad |
| 24 | POST | /api/guard/schedule | 保存排岗 | guard_day/night |
| 25 | GET | /api/guard/schedule | 获取排岗 | guard_day/night |
| 26 | POST | /api/guard/confirm | 确认排岗 | guard_day/night |
| 27 | GET | /api/notifications/guard | 排岗通知 | - |
| 28 | GET | /api/notifications/squad-guard | 班长排岗通知 | - |
| 29 | PUT | /api/notifications/guard/{id}/read | 标记排岗已读 | - |
| 30 | POST | /api/duty/start | 开始值班 | platoon/squad |
| 31 | POST | /api/duty/cancel | 取消值班 | platoon/squad |
| 32 | GET | /api/duty/status | 获取值班状态 | platoon/squad |
| 33 | GET | /api/notifications/unread-count | 未读通知数量 | - |
| 34 | GET | /api/notifications | 所有通知列表 | - |
| 35 | PUT | /api/notifications/{id}/read | 标记通知已读 | - |
| 36 | PUT | /api/notifications/read-all | 全部标记已读 | - |
| 37 | GET | /api/organization/structure | 编制结构 | - |
| 38 | GET | /api/organization/platoon/{id} | 排级信息 | - |
| 39 | GET | /api/organization/platoon/{id}/squad/{id} | 班级信息 | - |
| 40 | WS | /ws/notifications | 实时通知 | 所有页面 |
