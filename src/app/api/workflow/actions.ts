"use server";
import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function selectExecuteAbilityWorkflowsAction() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return workflows;
}
