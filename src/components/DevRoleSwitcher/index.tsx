import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ROLE_AUTHORITIES } from '../../constants/authorities.constant';
import {
  isDevAuthBypassEnabled,
  createDevBypassToken,
} from '../../shared/utils/auth/devAuthBypass';
import { getLocalStorageItem, setTokens } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { loginStore } from '../../redux/slices/loginSlice';
import type { RootState } from '../../redux/provider/store';

// camelCase role key -> readable label, e.g. "masterSuperAdmin" -> "Master Super Admin"
const humanize = (key: string): string =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const ROLE_OPTIONS = Object.entries(ROLE_AUTHORITIES).flatMap(([type, roles]) =>
  Object.keys(roles).map((roleKey) => ({
    type,
    roleKey,
    label: `${humanize(roleKey)} (${type})`,
  }))
);

/**
 * DEV-ONLY: lets the current fake bypass session (see devAuthBypass.ts) impersonate
 * any role defined in ROLE_AUTHORITIES, so role-gated UI can be previewed without a
 * real backend/login. Renders nothing unless VITE_BYPASS_AUTH=true.
 */
const DevRoleSwitcher = () => {
  const dispatch = useDispatch();
  const role = useSelector((state: RootState) => state.LoginSlice?.role);
  const [open, setOpen] = useState(false);

  const currentValue = useMemo(
    () =>
      ROLE_OPTIONS.find((o) => o.type === role?.type && humanize(o.roleKey) === role?.name)
        ?.label ?? '',
    [role]
  );

  if (!isDevAuthBypassEnabled()) return null;

  const handleSelect = (type: string, roleKey: string) => {
    const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || createDevBypassToken();
    setTokens(token, token);
    dispatch(
      loginStore({
        token,
        authorities: [],
        rememberMe: true,
        canManageCompanySettings: true,
        role: { name: humanize(roleKey), type },
        userId: 'dev-bypass-user',
        refreshToken: token,
      })
    );
    setOpen(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, fontSize: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #374151',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
        }}
      >
        Dev role: {currentValue || 'unset'}
      </button>
      {open && (
        <div
          style={{
            marginTop: 4,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 6,
            padding: 4,
          }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <div
              key={`${opt.type}-${opt.roleKey}`}
              onClick={() => handleSelect(opt.type, opt.roleKey)}
              style={{
                color: '#fff',
                padding: '6px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: opt.label === currentValue ? '#374151' : 'transparent',
                borderRadius: 4,
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevRoleSwitcher;
