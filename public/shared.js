/**
 * 人员在线管理系统 - Vue 3 共享库
 * 包含：API接口、权限判断、工具函数、Vue全局组件
 *
 * 权限层级：0 > 1 > 2 > 3 > 4=5（4和5同级）
 * 状态码：0=正常, 1=俱乐部/竞赛, 2=公差/勤务, 3=病号/请假/外出, 4=岗哨, 5=其他
 */

// ==================== 配置 ====================
var API_BASE_URL = 'https://houduan.xuenaixuenoxia90.workers.dev/api';
window.ROLE_NAMES = { 0: '队长', 1: '连干', 2: '排干', 3: '班长', 4: '卫生员', 5: '班员' };
window.STATUS_NAMES = { 0: '正常', 1: '俱乐部/竞赛', 2: '公差/勤务', 3: '病号/请假/外出', 4: '岗哨', 5: '其他' };
window.STATUS_COLORS = { 0: '#22c55e', 1: '#eab308', 2: '#3b82f6', 3: '#ef4444', 4: '#ff8c00', 5: '#581c87' };
window.PLATOON_NAMES = { 1: '一排', 2: '二排', 3: '三排', 4: '四排', 5: '五排', 6: '六排', 7: '七排', 8: '八排', 9: '九排', 10: '十排' };
var ROLE_NAMES = window.ROLE_NAMES;
var STATUS_NAMES = window.STATUS_NAMES;
var STATUS_COLORS = window.STATUS_COLORS;
var PLATOON_NAMES = window.PLATOON_NAMES;

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
        companyId: parseInt(localStorage.getItem('companyId') || '1'),
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
async function login(name, password, invite_code) {
    var data = await apiPost('/auth/login', { name: name, password: password, invite_code: invite_code });
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('companyId', data.companyId);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userPlatoon', data.platoon);
    localStorage.setItem('userSquad', data.squad);
    localStorage.setItem('userName', data.name);
    return data;
}

async function register(invite_code, name, password, role, platoon, squad) {
    var data = await apiPost('/auth/register', {
        invite_code: invite_code,
        name: name,
        password: password,
        role: role,
        platoon: platoon,
        squad: squad
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('companyId', data.companyId);
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
    localStorage.removeItem('companyId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlatoon');
    localStorage.removeItem('userSquad');
    localStorage.removeItem('onDuty');
    window.location.href = 'login.html';
}

// ==================== 人员 ====================
async function getPersonnel(platoon, squad, flatten) {
    var params = {};
    if (platoon !== undefined && platoon !== null) params.platoon = platoon;
    if (squad !== undefined && squad !== null) params.squad = squad;
    var result = await apiGet('/personnel', params);
    if (squad !== undefined && squad !== null && platoon !== undefined && platoon !== null) {
        var pKey = String(platoon), sKey = String(squad);
        return result[pKey] && result[pKey].squads && result[pKey].squads[sKey] ? result[pKey].squads[sKey] : [];
    }
    if (platoon !== undefined && platoon !== null) {
        if (flatten) {
            var list = [];
            var pk2 = String(platoon);
            var info2 = result[pk2];
            if (info2 && info2.squads) {
                for (var s2 in info2.squads) {
                    info2.squads[s2].forEach(function(u) {
                        list.push(Object.assign({}, u, { platoon: parseInt(pk2), squad: parseInt(s2) }));
                    });
                }
            }
            return list;
        }
        var pk = String(platoon);
        return result[pk] && result[pk].squads ? result[pk].squads : {};
    }
    if (flatten) {
        var list2 = [];
        for (var p in result) {
            var info = result[p];
            if (!info || !info.squads) continue;
            for (var s in info.squads) {
                info.squads[s].forEach(function(u) {
                    list2.push(Object.assign({}, u, { platoon: parseInt(p), squad: parseInt(s) }));
                });
            }
        }
        return list2;
    }
    return result;
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

// ==================== 弹窗工具 ====================
// 创建弹窗容器（如果不存在）
function ensureToastContainer() {
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:flex;justify-content:center;align-items:center;';
        document.body.appendChild(container);
    }
    return container;
}

// 显示加载弹窗
function showLoading(message) {
    message = message || '请求中...';
    var container = ensureToastContainer();
    
    var toast = document.createElement('div');
    toast.className = 'toast-loading';
    toast.style.cssText = 'background:rgba(0,0,0,0.8);color:white;padding:24px 32px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    
    // 旋转动画
    var spinner = document.createElement('div');
    spinner.style.cssText = 'width:40px;height:40px;border:4px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;';
    
    var text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = 'font-size:16px;font-weight:500;';
    
    toast.appendChild(spinner);
    toast.appendChild(text);
    container.appendChild(toast);
    
    // 添加动画样式（如果不存在）
    if (!document.getElementById('toast-styles')) {
        var style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}@keyframes fadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.8)}}';
        document.head.appendChild(style);
    }
    
    toast.style.animation = 'fadeIn 0.2s ease-out';
    
    return function() {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 200);
        }
    };
}

// 显示成功弹窗
function showSuccess(message, duration) {
    duration = duration || 1500;
    var container = ensureToastContainer();
    
    var toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(34,197,94,0.95);color:white;padding:24px 32px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeIn 0.2s ease-out;';
    
    // 对勾图标
    var icon = document.createElement('div');
    icon.style.cssText = 'width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;';
    icon.textContent = '✓';
    
    var text = document.createElement('div');
    text.textContent = message || '操作成功';
    text.style.cssText = 'font-size:16px;font-weight:500;';
    
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }, duration);
}

// 显示错误弹窗
function showError(message, duration) {
    duration = duration || 2000;
    var container = ensureToastContainer();
    
    var toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(239,68,68,0.95);color:white;padding:24px 32px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeIn 0.2s ease-out;';
    
    // 叉号图标
    var icon = document.createElement('div');
    icon.style.cssText = 'width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;';
    icon.textContent = '✕';
    
    var text = document.createElement('div');
    text.textContent = message || '操作失败';
    text.style.cssText = 'font-size:16px;font-weight:500;';
    
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }, duration);
}

// 包装异步函数，自动显示loading
function withLoading(asyncFn, loadingMessage) {
    return async function() {
        var hideLoading = showLoading(loadingMessage);
        try {
            var result = await asyncFn.apply(this, arguments);
            hideLoading();
            showSuccess('操作成功');
            return result;
        } catch (error) {
            hideLoading();
            showError(error.message || '操作失败');
            throw error;
        }
    };
}

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
