/**
 * 人员在线管理系统 - Vue 3 共享库
 * 包含：API接口、权限判断、工具函数、Vue全局组件
 *
 * 权限层级：0 > 1 > 2 > 3 > 4=5（4和5同级）
 * 状态码：0=正常, 1=俱乐部/竞赛, 2=公差/勤务, 3=病号/请假/外出, 4=岗哨, 5=其他
 */

// ==================== 配置 ====================
const API_BASE_URL = 'https://houduan.bloggogo.xyz/api';
const ROLE_NAMES = { 0: '队长', 1: '连干', 2: '排干', 3: '班长', 4: '卫生员', 5: '班员' };
const STATUS_NAMES = { 0: '正常', 1: '俱乐部/竞赛', 2: '公差/勤务', 3: '病号/请假/外出', 4: '岗哨', 5: '其他' };
const STATUS_COLORS = { 0: '#22c55e', 1: '#eab308', 2: '#3b82f6', 3: '#ef4444', 4: '#ff8c00', 5: '#581c87' };
const PLATOON_NAMES = { 1: '一排', 2: '二排', 3: '三排', 4: '四排', 5: '五排', 6: '六排', 7: '七排', 8: '八排', 9: '九排', 10: '十排' };

// ==================== 工具函数 ====================
function getTodayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function getCurrentUser() {
    return {
        id: parseInt(localStorage.getItem('userId') || '0'),
        name: localStorage.getItem('userName') || '',
        role: parseInt(localStorage.getItem('userRole') || '5'),
        platoon: parseInt(localStorage.getItem('userPlatoon') || '0'),
        squad: parseInt(localStorage.getItem('userSquad') || '0')
    };
}

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function checkLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 计算有效权限（值班时降级）
function getEffectiveRole(role) {
    var onDuty = parseInt(localStorage.getItem('onDuty') || '0');
    if (onDuty === 1 && role === 3) return 2;
    if (onDuty === 1 && role === 2) return 1;
    return role;
}

// 判断是否有修改权限
function canModifyPerson(userRole, effectiveRole, targetPlatoon, targetSquad, userPlatoon, userSquad) {
    if (userRole <= 2 || effectiveRole <= 2) return true; // 连长/连干/排干/值班可改任意
    if (userRole === 3 && targetPlatoon === userPlatoon && targetSquad === userSquad) return true; // 班长只能改本班
    return false;
}

// ==================== API 请求 ====================
async function apiRequest(method, endpoint, body, params) {
    var url = API_BASE_URL + endpoint;
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
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var options = { method: method, headers: headers };
    if (body) options.body = JSON.stringify(body);
    var response = await fetch(url, options);
    var result = await response.json();
    if (result.code !== 200) throw new Error(result.message || '请求失败');
    return result.data;
}

function apiGet(endpoint, params) { return apiRequest('GET', endpoint, null, params); }
function apiPost(endpoint, body, params) { return apiRequest('POST', endpoint, body, params); }
function apiPut(endpoint, body, params) { return apiRequest('PUT', endpoint, body, params); }
function apiDelete(endpoint, params) { return apiRequest('DELETE', endpoint, null, params); }

// ==================== 认证 ====================
async function login(role, platoon, squad) {
    var data = await apiPost('/auth/login', { role: role, platoon: platoon, squad: squad });
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userPlatoon', data.platoon);
    localStorage.setItem('userSquad', data.squad);
    localStorage.setItem('userName', data.name);
    return data;
}

async function logout() {
    try { await apiPost('/auth/logout'); } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlatoon');
    localStorage.removeItem('userSquad');
    localStorage.removeItem('onDuty');
    window.location.href = 'login.html';
}

// ==================== 人员 ====================
async function getPersonnel(platoon, squad) {
    var params = {};
    if (platoon !== undefined && platoon !== null) params.platoon = platoon;
    if (squad !== undefined && squad !== null) params.squad = squad;
    return apiGet('/personnel', params);
}

async function updatePersonStatus(personId, status, remark) {
    var body = { status: status };
    if (remark !== undefined && remark !== null) body.remark = remark;
    return apiPut('/personnel/' + personId + '/status', body);
}

// ==================== 命令 ====================
async function createCheckCommand(targetRole, remark) {
    var body = { targetRole: targetRole };
    if (remark) body.remark = remark;
    return apiPost('/commands/check', body);
}

async function createDutyCommand(targetRole, dutyTypes, remark) {
    var body = { targetRole: targetRole, dutyTypes: dutyTypes };
    if (remark) body.remark = remark;
    return apiPost('/commands/duty', body);
}

async function createEmergencyCommand(remark) {
    return apiPost('/commands/emergency', { remark: remark });
}

// ==================== 报人 ====================
async function submitPersonReport(platoon, squad, reportData) {
    return apiPost('/reports/person', { platoon: platoon, squad: squad, data: reportData });
}

// ==================== 留言 ====================
async function createMessage(content) {
    return apiPost('/messages', { content: content });
}

async function getMessages(page, pageSize) {
    var params = {};
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;
    return apiGet('/messages', params);
}

// ==================== 排岗 ====================
async function getGuardSchedule(guardType) {
    return apiGet('/guard/schedule', { type: guardType });
}

async function saveGuardSchedule(guardType, assignments) {
    return apiPost('/guard/schedule', { guardType: guardType, assignments: assignments });
}

async function confirmGuardSchedule(guardType, assignments) {
    return apiPost('/guard/confirm', { guardType: guardType, assignments: assignments });
}

// ==================== 值班 ====================
async function startDuty() {
    return apiPost('/duty/start');
}

async function cancelDuty() {
    return apiPost('/duty/cancel');
}

async function getDutyStatus() {
    return apiGet('/duty/status');
}

// ==================== 通知 ====================
async function getUnreadNotificationCount() { return apiGet('/notifications/unread-count'); }
async function getNotifications(type) { var p = {}; if (type) p.type = type; return apiGet('/notifications', p); }
async function markNotificationRead(id) { return apiPut('/notifications/' + id + '/read'); }
async function markAllNotificationsRead() { return apiPut('/notifications/read-all'); }
async function getCheckNotifications() { return apiGet('/notifications/check'); }
async function markCheckNotificationRead(id) { return apiPut('/notifications/check/' + id + '/read'); }
async function getReportNotifications() { return apiGet('/notifications/report'); }
async function handleReportNotification(id, action, remark) { var b = { action: action }; if (remark) b.remark = remark; return apiPut('/notifications/report/' + id, b); }
async function getReportDetail(id) { return apiGet('/notifications/report/' + id); }
async function getRejectionNotifications() { return apiGet('/notifications/rejection'); }
async function getDutyNotifications() { return apiGet('/notifications/duty'); }
async function markDutyNotificationRead(id) { return apiPut('/notifications/duty/' + id + '/read'); }
async function getEmergencyNotifications() { return apiGet('/notifications/emergency'); }
async function markEmergencyNotificationRead(id) { return apiPut('/notifications/emergency/' + id + '/read'); }
async function getGuardNotifications() { return apiGet('/notifications/guard'); }
async function getSquadGuardNotifications() { return apiGet('/notifications/squad-guard'); }
async function markGuardNotificationRead(id) { return apiPut('/notifications/guard/' + id + '/read'); }

// ==================== 编制 ====================
async function getOrganizationStructure() { return apiGet('/organization/structure'); }
async function getPlatoonInfo(id) { return apiGet('/organization/platoon/' + id); }
async function getSquadInfo(platoonId, squadId) { return apiGet('/organization/platoon/' + platoonId + '/squad/' + squadId); }

// ==================== Vue 3 全局注册 ====================
// 注册全局组件和混入
function registerGlobalComponents(app) {
    // 全局混入：提供常用数据和方法
    app.mixin({
        data: function() {
            return {
                ROLE_NAMES: ROLE_NAMES,
                STATUS_NAMES: STATUS_NAMES,
                STATUS_COLORS: STATUS_COLORS,
                PLATOON_NAMES: PLATOON_NAMES
            };
        },
        methods: {
            getCurrentUser: getCurrentUser,
            getEffectiveRole: getEffectiveRole,
            canModifyPerson: canModifyPerson,
            getTodayStr: getTodayStr,
            checkLogin: checkLogin,
            isLoggedIn: isLoggedIn
        }
    });
}
