// What may be loaded alongside a record when a user is only shown by name/role.
// Never include a whole user row: that loads passwordHash and the lockout counters,
// and anything handed to a client component is sent to the browser.
export const SAFE_USER = { id: true, name: true, email: true, role: true, loginId: true, employeeId: true, active: true } as const;
