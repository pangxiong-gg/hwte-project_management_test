// 角色權限工具
export const ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  DEVELOPER: 'DEVELOPER',
  TESTER: 'TESTER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// 檢查角色是否在允許列表中
export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

// 是否為管理員或專案經理
export function isAdminOrPM(userRole: string | undefined): boolean {
  return hasRole(userRole, [ROLES.ADMIN, ROLES.PROJECT_MANAGER]);
}

// 是否可以創建需求
export function canCreateRequirement(userRole: string | undefined): boolean {
  return isAdminOrPM(userRole);
}

// 是否可以創建任務
export function canCreateTask(userRole: string | undefined): boolean {
  return isAdminOrPM(userRole);
}

// 是否可以指派任務
export function canAssignTask(userRole: string | undefined): boolean {
  return isAdminOrPM(userRole);
}

// 是否可以編輯任務（狀態/Git）
export function canEditTask(userRole: string | undefined, isAssignee: boolean): boolean {
  return isAdminOrPM(userRole) || (userRole === ROLES.DEVELOPER && isAssignee);
}

// 是否可以創建 Bug
export function canCreateBug(_userRole: string | undefined): boolean {
  return true; // 所有人都可以創建 Bug
}

// 是否可以指派 Bug
export function canAssignBug(userRole: string | undefined): boolean {
  return isAdminOrPM(userRole);
}

// 是否可以更新 Bug 狀態
export function canUpdateBugStatus(userRole: string | undefined, isAssignee: boolean): boolean {
  return isAdminOrPM(userRole) || (userRole === ROLES.DEVELOPER && isAssignee);
}

// 是否可以管理測試用例
export function canManageTestCase(userRole: string | undefined): boolean {
  return hasRole(userRole, [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TESTER]);
}

// 是否可以執行測試
export function canExecuteTest(userRole: string | undefined): boolean {
  return hasRole(userRole, [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TESTER]);
}
