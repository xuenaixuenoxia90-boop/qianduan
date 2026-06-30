/**
 * 人员在线管理系统 - API接口定义
 * 对接后端 API_CONTRACT.md
 *
 * 权限说明（前端角色映射）：
 *   0 → 队长（最高权限）
 *   1 → 连干
 *   2 → 排干
 *   3 → 班长
 *   4 → 卫生员（与班员同级）
 *   5 → 班员
 *
 * 权限层级：0 > 1 > 2 > 3 > 4=5（4和5同级）
 *
 * 后端响应格式：{ code: number, message: string, data?: any }
 */

// API基础配置
var API_BASE_URL = 'https://backroom.bloggogo.xyz/api';

// 角色名称
var ROLE_NAMES = { 0: '队长', 1: '连干', 2: '排干', 3: '班长', 4: '卫生员', 5: '班员' };

// 状态码含义（新契约）
var STATUS_NAMES = { 
    0: '正常', 
    1: '俱乐部/竞赛', 
    2: '公差/勤务', 
    3: '病号/请假/外出', 
    4: '岗哨', 
    5: '其他' 
};

// ============================================
// 通用请求方法
// ============================================

async function apiRequest(method, endpoint, body, params) {
    var url = API_BASE_URL + endpoint;

    // 拼接查询参数
    if (params) {
        var qs = [];
        for (var k in params) {
            if (params[k] !== undefined && params[k] !== null) {
                qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
            }
        }
        if (qs.length > 0) url += '?' + qs.join('&');
    }

    var headers = { 'Content-Type': 'application/json' };
    var token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    var options = {
        method: method,
        headers: headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    var response = await fetch(url, options);
    var result = await response.json();

    // 新契约格式：{ code, message, data }
    if (result.code !== 200) {
        throw new Error(result.message || '请求失败');
    }

    return result.data;
}

async function apiGet(endpoint, params) {
    return apiRequest('GET', endpoint, null, params);
}

async function apiPost(endpoint, body, params) {
    return apiRequest('POST', endpoint, body, params);
}

async function apiPut(endpoint, body, params) {
    return apiRequest('PUT', endpoint, body, params);
}

async function apiDelete(endpoint, params) {
    return apiRequest('DELETE', endpoint, null, params);
}

// ============================================
// 1. 用户认证模块
// ============================================

// 登录（role + platoon + squad）
async function login(role, platoon, squad) {
    var data = await apiPost('/auth/login', { 
        role: role, 
        platoon: platoon, 
        squad: squad 
    });
    
    // 保存 token 和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userPlatoon', data.platoon);
    localStorage.setItem('userSquad', data.squad);
    localStorage.setItem('userName', data.name);
    
    return data;
}

// 获取当前用户信息
async function getCurrentUserInfo() {
    return apiGet('/auth/me');
}

// 获取当前用户信息（从 localStorage 缓存中读取）
function getCurrentUser() {
    return {
        id: parseInt(localStorage.getItem('userId') || '0'),
        name: localStorage.getItem('userName') || '',
        role: parseInt(localStorage.getItem('userRole') || '5'),
        platoon: parseInt(localStorage.getItem('userPlatoon') || '0'),
        squad: parseInt(localStorage.getItem('userSquad') || '0')
    };
}

// 登出
async function logout() {
    try {
        await apiPost('/auth/logout');
    } catch (e) {
        // 忽略登出错误
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlatoon');
    localStorage.removeItem('userSquad');
    localStorage.removeItem('onDuty');
    window.location.href = 'login.html';
}

// ============================================
// 2. 人员状态模块
// ============================================

// 获取人员列表（嵌套格式：按排-班分组）
async function getPersonnel(platoon, squad) {
    var params = {};
    if (platoon !== undefined && platoon !== null) params.platoon = platoon;
    if (squad !== undefined && squad !== null) params.squad = squad;
    return apiGet('/personnel', params);
}

// 修改人员状态
async function updatePersonStatus(personId, status, remark) {
    var body = { status: status };
    if (remark !== undefined && remark !== null) body.remark = remark;
    return apiPut('/personnel/' + personId + '/status', body);
}

// 批量修改人员状态
async function batchUpdatePersonStatus(personIds, status) {
    return apiPut('/personnel/batch-status', { 
        personIds: personIds, 
        status: status 
    });
}

// ============================================
// 3. 命令模块
// ============================================

// 发布查人命令
async function createCheckCommand(targetRole, remark) {
    var body = { targetRole: targetRole };
    if (remark) body.remark = remark;
    return apiPost('/commands/check', body);
}

// 发布公差命令
async function createDutyCommand(targetRole, dutyTypes, remark) {
    var body = { 
        targetRole: targetRole, 
        dutyTypes: dutyTypes 
    };
    if (remark) body.remark = remark;
    return apiPost('/commands/duty', body);
}

// 发布紧急命令（仅队长）
async function createEmergencyCommand(remark) {
    return apiPost('/commands/emergency', { remark: remark });
}

// ============================================
// 4. 报人模块
// ============================================

// 提交报人信息
async function submitPersonReport(platoon, squad, reportData) {
    return apiPost('/reports/person', {
        platoon: platoon,
        squad: squad,
        data: reportData
    });
}

// ============================================
// 5. 留言模块（说一说）
// ============================================

// 发布留言
async function createMessage(content) {
    return apiPost('/messages', { content: content });
}

// 获取留言列表
async function getMessages(page, pageSize) {
    var params = {};
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;
    return apiGet('/messages', params);
}

// 删除留言
async function deleteMessage(messageId) {
    return apiDelete('/messages/' + messageId);
}

// ============================================
// 6. 排岗模块
// ============================================

// 保存排岗安排
async function saveGuardSchedule(guardType, assignments) {
    return apiPost('/guard/schedule', {
        guardType: guardType,
        assignments: assignments
    });
}

// 获取排岗安排
async function getGuardSchedule(guardType) {
    return apiGet('/guard/schedule', { type: guardType });
}

// 确认排岗
async function confirmGuardSchedule(guardType, assignments) {
    return apiPost('/guard/confirm', {
        guardType: guardType,
        assignments: assignments
    });
}

// ============================================
// 7. 值班模块
// ============================================

// 开始值班
async function startDuty() {
    return apiPost('/duty/start');
}

// 取消值班
async function cancelDuty() {
    return apiPost('/duty/cancel');
}

// 获取值班状态
async function getDutyStatus() {
    return apiGet('/duty/status');
}

// ============================================
// 8. 通知模块
// ============================================

// 获取未读通知数量
async function getUnreadNotificationCount() {
    return apiGet('/notifications/unread-count');
}

// 获取所有通知列表
async function getNotifications(type) {
    var params = {};
    if (type) params.type = type;
    return apiGet('/notifications', params);
}

// 标记单条通知已读
async function markNotificationRead(notificationId) {
    return apiPut('/notifications/' + notificationId + '/read');
}

// 标记所有通知已读
async function markAllNotificationsRead() {
    return apiPut('/notifications/read-all');
}

// 获取查人通知列表
async function getCheckNotifications() {
    return apiGet('/notifications/check');
}

// 标记查人通知已读
async function markCheckNotificationRead(notificationId) {
    return apiPut('/notifications/check/' + notificationId + '/read');
}

// 获取报人通知列表
async function getReportNotifications() {
    return apiGet('/notifications/report');
}

// 处理报人通知
async function handleReportNotification(notificationId, action, remark) {
    var body = { action: action };
    if (remark) body.remark = remark;
    return apiPut('/notifications/report/' + notificationId, body);
}

// 获取报人详情
async function getReportDetail(notificationId) {
    return apiGet('/notifications/report/' + notificationId);
}

// 获取驳回通知
async function getRejectionNotifications() {
    return apiGet('/notifications/rejection');
}

// 获取公差通知列表
async function getDutyNotifications() {
    return apiGet('/notifications/duty');
}

// 标记公差通知已读
async function markDutyNotificationRead(notificationId) {
    return apiPut('/notifications/duty/' + notificationId + '/read');
}

// 获取紧急命令通知
async function getEmergencyNotifications() {
    return apiGet('/notifications/emergency');
}

// 标记紧急命令已读
async function markEmergencyNotificationRead(notificationId) {
    return apiPut('/notifications/emergency/' + notificationId + '/read');
}

// 获取排岗通知
async function getGuardNotifications() {
    return apiGet('/notifications/guard');
}

// 获取班长排岗通知
async function getSquadGuardNotifications() {
    return apiGet('/notifications/squad-guard');
}

// 标记排岗通知已读
async function markGuardNotificationRead(notificationId) {
    return apiPut('/notifications/guard/' + notificationId + '/read');
}

// ============================================
// 9. 编制信息模块
// ============================================

// 获取编制结构
async function getOrganizationStructure() {
    return apiGet('/organization/structure');
}

// 获取排级信息
async function getPlatoonInfo(platoonId) {
    return apiGet('/organization/platoon/' + platoonId);
}

// 获取班级信息
async function getSquadInfo(platoonId, squadId) {
    return apiGet('/organization/platoon/' + platoonId + '/squad/' + squadId);
}

// ============================================
// 辅助函数
// ============================================

// 是否已登录
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

// 检查登录状态，未登录则跳转
function checkLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
