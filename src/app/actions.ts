"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { requireContext } from "@/lib/context";
import { commit, getDb, replaceDb } from "@/lib/db";
import {
  changeContractStatus,
  changeLeadStatus,
  changeOpportunityStage,
  convertLead,
  createAccount,
  createActivity,
  createContact,
  createContract,
  createLead,
  createOpportunity,
  deleteView,
  inviteUser,
  saveView,
  setUserActive,
  softDelete,
  transferOwner,
  updateAccount,
  updateContact,
  updateContract,
  updateLead,
  updateOpportunity,
  updatePipeline,
  updateRolePermissions,
} from "@/lib/domain";
import { parseAccount, parseActivity, parseContact, parseContract, parseLead, parseOpportunity } from "@/lib/form-input";
import { createSeed } from "@/lib/seed";
import { clearSession, setSession } from "@/lib/session";
import { emptyActionState, type ActionState, type CrmObject, type DomainResult } from "@/lib/types";

function toState<T>(result: DomainResult<T>, notice = ""): ActionState {
  if (result.ok) {
    return { ...emptyActionState, notice };
  }
  return {
    ok: false,
    error: result.error,
    notice: "",
    fieldErrors: result.fieldErrors ?? {},
    duplicates: result.duplicates ?? [],
  };
}

function safeNext(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/crm/dashboard";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = error.message.toLowerCase().includes("confirm")
        ? "Confirme o email antes de entrar. O Supabase enviou um link de confirmação."
        : "Email ou senha inválidos.";
      return { ...emptyActionState, ok: false, error: message };
    }
    redirect(next);
  }
  if (password !== "horizonte") {
    return { ...emptyActionState, ok: false, error: "Email ou senha inválidos." };
  }
  const db = await getDb();
  const user = db.profiles.find((profile) => profile.email === email && profile.isActive);
  if (!user) return { ...emptyActionState, ok: false, error: "Email ou senha inválidos." };
  await commit((current) => {
    const nextDb = structuredClone(current);
    const profile = nextDb.profiles.find((item) => item.id === user.id);
    if (profile) profile.lastSeenAt = new Date().toISOString();
    return { db: nextDb, result: { ok: true as const, data: true } };
  });
  await setSession(user.id);
  redirect(next);
}

export async function logoutAction() {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/login");
}

async function finish(result: DomainResult<{ id: string }>, listPath: string, formData?: FormData): Promise<ActionState> {
  if (!result.ok) return toState(result);
  revalidatePath(listPath);
  if (formData?.get("saveMode") === "new") redirect(`${listPath}/new`);
  redirect(`${listPath}/${result.data.id}`);
}

export async function createLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseLead(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => createLead(db, user.id, parsed.value)), "/crm/leads");
}

export async function updateLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseLead(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => updateLead(db, user.id, String(formData.get("id")), parsed.value)), "/crm/leads", formData);
}

export async function createAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseAccount(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => createAccount(db, user.id, parsed.value)), "/crm/accounts");
}

export async function updateAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseAccount(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => updateAccount(db, user.id, String(formData.get("id")), parsed.value)), "/crm/accounts", formData);
}

export async function createContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseContact(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => createContact(db, user.id, parsed.value)), "/crm/contacts");
}

export async function updateContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseContact(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => updateContact(db, user.id, String(formData.get("id")), parsed.value)), "/crm/contacts", formData);
}

export async function createOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseOpportunity(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => createOpportunity(db, user.id, parsed.value)), "/crm/opportunities");
}

export async function updateOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseOpportunity(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => updateOpportunity(db, user.id, String(formData.get("id")), parsed.value)), "/crm/opportunities", formData);
}

export async function createContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseContract(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => createContract(db, user.id, parsed.value)), "/crm/contracts");
}

export async function updateContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseContract(formData);
  if ("state" in parsed) return parsed.state;
  return finish(await commit((db) => updateContract(db, user.id, String(formData.get("id")), parsed.value)), "/crm/contracts", formData);
}

export async function changeLeadStatusAction(input: { leadId: string; statusId: string; reason: string }): Promise<ActionState> {
  const { user } = await requireContext();
  const result = await commit((db) => changeLeadStatus(db, user.id, input.leadId, input.statusId, input.reason));
  if (result.ok) revalidatePath(`/crm/leads/${input.leadId}`);
  return toState(result);
}

export async function changeOpportunityStageAction(input: {
  opportunityId: string;
  stageId: string;
  lossReason: string;
}): Promise<ActionState> {
  const { user } = await requireContext();
  const result = await commit((db) => changeOpportunityStage(db, user.id, input.opportunityId, input.stageId, input.lossReason));
  if (result.ok) {
    revalidatePath("/crm/opportunities");
    revalidatePath(`/crm/opportunities/${input.opportunityId}`);
  }
  return toState(result);
}

export async function changeContractStatusAction(input: { contractId: string; statusId: string }): Promise<ActionState> {
  const { user } = await requireContext();
  const result = await commit((db) => changeContractStatus(db, user.id, input.contractId, input.statusId));
  if (result.ok) {
    revalidatePath("/crm/contracts");
    revalidatePath(`/crm/contracts/${input.contractId}`);
  }
  return toState(result);
}

export async function convertLeadAction(input: {
  leadId: string;
  accountMode: "create" | "link";
  accountId?: string;
  accountName?: string;
  taxId?: string;
  contactMode: "create" | "link";
  contactId?: string;
  createOpportunity: boolean;
  opportunityName?: string;
  ownerId?: string;
  acknowledgeDuplicates: boolean;
}): Promise<ActionState & { href?: string }> {
  const { user } = await requireContext();
  const result = await commit((db) => convertLead(db, user.id, input));
  if (!result.ok) return toState(result);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/accounts");
  revalidatePath("/crm/contacts");
  revalidatePath("/crm/opportunities");
  const href = result.data.opportunityId
    ? `/crm/opportunities/${result.data.opportunityId}`
    : `/crm/accounts/${result.data.accountId}`;
  return { ...emptyActionState, notice: "Lead convertido.", href };
}

export async function deleteRecordAction(input: { object: CrmObject; id: string }): Promise<ActionState> {
  const { user } = await requireContext();
  const result = await commit((db) => softDelete(db, user.id, input.object, input.id));
  if (!result.ok) return toState(result);
  revalidatePath(`/crm/${input.object === "opportunity" ? "opportunities" : `${input.object}s`}`);
  redirect(listPath(input.object));
}

export async function bulkRecordsAction(input: {
  object: CrmObject;
  ids: string[];
  type: "delete" | "transfer";
  ownerId?: string;
}): Promise<ActionState> {
  const { user } = await requireContext();
  const result = await commit((db) => {
    if (input.type === "transfer") {
      return transferOwner(db, user.id, input.object, input.ids, input.ownerId ?? "");
    }
    let current = db;
    for (const id of input.ids) {
      const step = softDelete(current, user.id, input.object, id);
      if (!step.result.ok) return { db, result: step.result };
      current = step.db;
    }
    return { db: current, result: { ok: true as const, data: { count: input.ids.length } } };
  });
  if (result.ok) revalidatePath(listPath(input.object));
  return toState(result, result.ok ? "Registros atualizados." : "");
}

export async function createActivityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireContext();
  const parsed = parseActivity(formData);
  if ("state" in parsed) return parsed.state;
  const result = await commit((db) => createActivity(db, user.id, parsed.value));
  if (result.ok) revalidatePath(recordPath(parsed.value.objectType, parsed.value.recordId));
  return toState(result, result.ok ? "Atividade registrada." : "");
}

export async function saveViewAction(formData: FormData) {
  const { user } = await requireContext();
  const objectType = String(formData.get("objectType")) as CrmObject;
  let filters: Record<string, string> = {};
  try {
    filters = JSON.parse(String(formData.get("filters") ?? "{}")) as Record<string, string>;
  } catch {
    filters = {};
  }
  await commit((db) => saveView(db, user.id, {
    objectType,
    name: String(formData.get("name") ?? ""),
    shared: formData.get("shared") === "on",
    filters,
  }));
  revalidatePath(listPath(objectType));
}

export async function deleteViewAction(formData: FormData) {
  const { user } = await requireContext();
  const objectType = String(formData.get("objectType")) as CrmObject;
  await commit((db) => deleteView(db, user.id, String(formData.get("id"))));
  revalidatePath(listPath(objectType));
}

export async function inviteUserAction(formData: FormData) {
  const { user } = await requireContext();
  const result = await commit((db) => inviteUser(db, user.id, {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    roleId: String(formData.get("roleId") ?? ""),
    managerId: String(formData.get("managerId") ?? "") || null,
  }));
  revalidatePath("/admin/users");
  if (!result.ok) redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
  redirect("/admin/users");
}

export async function toggleUserAction(formData: FormData) {
  const { user } = await requireContext();
  const result = await commit((db) => setUserActive(
    db,
    user.id,
    String(formData.get("userId")),
    String(formData.get("isActive")) === "true",
  ));
  if (!result.ok) return;
  revalidatePath("/admin/users");
}

export async function saveRolesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, db } = await requireContext();
  const roles = db.roles.filter((role) => role.name !== "Administrador");
  let failure: ActionState | null = null;
  let current = db;
  for (const role of roles) {
    const permissionIds = db.permissions
      .filter((permission) => formData.get(`perm:${role.id}:${permission.id}`) === "on")
      .map((permission) => permission.id);
    const step = updateRolePermissions(current, user.id, role.id, permissionIds);
    if (!step.result.ok) {
      failure = toState(step.result);
      break;
    }
    current = step.db;
  }
  if (failure) return failure;
  await replaceDb(current);
  revalidatePath("/admin/roles");
  return { ...emptyActionState, notice: "Permissões atualizadas." };
}

export async function savePipelineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, db } = await requireContext();
  const statuses = db.leadStatuses.map((status) => ({
    id: status.id,
    guidanceText: String(formData.get(`status:${status.id}:guidance`) ?? ""),
    sortOrder: Number(formData.get(`status:${status.id}:sortOrder`) ?? status.sortOrder),
  }));
  const stages = db.opportunityStages.map((stage) => ({
    id: stage.id,
    guidanceText: String(formData.get(`stage:${stage.id}:guidance`) ?? ""),
    sortOrder: Number(formData.get(`stage:${stage.id}:sortOrder`) ?? stage.sortOrder),
    defaultProbability: Number(formData.get(`stage:${stage.id}:probability`) ?? stage.defaultProbability),
  }));
  const contractStatuses = db.contractStatuses.map((status) => ({
    id: status.id,
    guidanceText: String(formData.get(`contract:${status.id}:guidance`) ?? ""),
    sortOrder: Number(formData.get(`contract:${status.id}:sortOrder`) ?? status.sortOrder),
  }));
  const result = await commit((current) => updatePipeline(current, user.id, { statuses, stages, contractStatuses }));
  if (result.ok) revalidatePath("/admin/pipelines");
  return toState(result, result.ok ? "Funil atualizado." : "");
}

export async function resetDemoAction() {
  const { user, db } = await requireContext();
  const allowed = db.rolePermissions.some((item) => item.roleId === user.roleId && db.permissions.some((permission) => permission.id === item.permissionId && permission.key === "settings.manage"));
  if (!allowed) return;
  await replaceDb(createSeed());
  revalidatePath("/", "layout");
  redirect("/crm/dashboard");
}

function listPath(object: CrmObject): string {
  if (object === "opportunity") return "/crm/opportunities";
  return `/crm/${object}s`;
}

function recordPath(object: CrmObject, id: string): string {
  return `${listPath(object)}/${id}`;
}
