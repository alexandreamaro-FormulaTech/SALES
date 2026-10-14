"use client";

import { saveRolesAction } from "@/app/actions";
import { emptyActionState, type Permission, type Role, type RolePermission } from "@/lib/types";
import { Fragment, useActionState } from "react";

export function RolesMatrix({
  roles,
  permissions,
  grants,
}: {
  roles: Role[];
  permissions: Permission[];
  grants: RolePermission[];
}) {
  const [state, action, pending] = useActionState(saveRolesAction, emptyActionState);
  const groups = [...new Set(permissions.map((permission) => permission.group))];
  return (
    <form action={action} className="space-y-4">
      {state.error ? <div role="alert" className="alert">{state.error}</div> : null}
      {state.notice ? <div className="notice" role="status">{state.notice}</div> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Permissão</th>
              {roles.map((role) => <th key={role.id}>{role.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group}>
                <tr><td colSpan={roles.length + 1} className="bg-canvas font-bold">{group}</td></tr>
                {permissions.filter((permission) => permission.group === group).map((permission) => (
                  <tr key={permission.id}>
                    <td>{permission.label}</td>
                    {roles.map((role) => {
                      const checked = grants.some((item) => item.roleId === role.id && item.permissionId === permission.id);
                      const locked = role.name === "Administrador";
                      return (
                        <td key={role.id}>
                          <input
                            type="checkbox"
                            name={`perm:${role.id}:${permission.id}`}
                            defaultChecked={checked}
                            disabled={locked}
                            aria-label={`${permission.label} para ${role.name}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar papéis"}</button>
    </form>
  );
}
