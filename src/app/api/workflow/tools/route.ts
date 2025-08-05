import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return Response.json(workflows);
}
