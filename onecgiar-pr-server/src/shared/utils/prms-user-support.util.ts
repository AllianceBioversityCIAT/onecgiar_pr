export const getUserSupportId = (email: string): string => {
  return `(select u.id from users u where  u.email = '${email}' limit 1)`;
};
