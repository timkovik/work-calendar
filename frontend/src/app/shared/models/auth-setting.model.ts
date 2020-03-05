export interface AuthSetting {
  MAIL_POSTFIX: string;
  FEATURE_AVATAR_SOURCE: 'NO' | 'CONFLUENCE';
  FEATURE_AUTH_TYPE: 'PASSWORD' | 'LDAP';
  FEATURE_WEB_PUSH: 'NO' | 'YES';
  FEATURE_FILE_STORAGE: 'NO' | 'YES';
  PRINT_COMPANY_NAME: string;
  PRINT_HEAD_MANAGER_POSITION: string;
  PRINT_HEAD_MANAGER_NAME: string;
  PUSH_PUBLIC_KEY: string;
  LOGO_NAME: string;
}
