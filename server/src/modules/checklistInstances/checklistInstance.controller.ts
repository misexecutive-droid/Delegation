import type { Request, Response } from "express"
import { checklistInstanceService, type InstanceStatusFilter } from "./checklistInstance.service.js"
import { setChecklistInstanceItemDoneSchema, verifyChecklistInstanceSchema, checklistInstanceComplianceReportQuerySchema, listChecklistInstancesQuerySchema } from "./checklistInstance.validation.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import { resolveReportScope, resolveStoreIdForDepartment } from "../../utils/reportScope.js"

export const checklistInstanceController = {
    // GET /checklist-instances/mine?status=OPEN|COMPLETED
    // Paginated. Responds `{ success, data, meta }` — `data` is the same array shape as before,
    // so a caller that ignores `meta` still works, it just gets the first page.
    getMine: asyncHandler(async (req: Request, res: Response) => {
        const status = req.query.status as InstanceStatusFilter | undefined
        const { page, limit } = listChecklistInstancesQuerySchema.parse(req.query)
        const result = await checklistInstanceService.getMine(req.user!.sub, status, page, limit)
        res.json({ success: true, ...result })
    }),

    // GET /checklist-instances?definitionId=&storeId=&status=&assigneeId=  (ADMIN only)
    list: asyncHandler(async (req: Request, res: Response) => {
        const { definitionId, storeId, status, assigneeId } = req.query
        const { page, limit } = listChecklistInstancesQuerySchema.parse(req.query)
        const result = await checklistInstanceService.listAll({
            definitionId: definitionId as string | undefined,
            storeId: storeId as string | undefined,
            status: status as InstanceStatusFilter | undefined,
            assigneeId: assigneeId as string | undefined,
            page,
            limit,
        })
        res.json({ success: true, ...result })
    }),

    // GET /checklist-instances/pending-verification (PC own-store / ADMIN all)
    listPendingVerification: asyncHandler(async (req: Request, res: Response) => {
        const { page, limit } = listChecklistInstancesQuerySchema.parse(req.query)
        const result = await checklistInstanceService.listPendingVerification(req.user!, page, limit)
        res.json({ success: true, ...result })
    }),

    // GET /checklist-instances/summary?mine=1|storeId=&assigneeId=&definitionId=
    // The counts the compliance board and dashboard cards used to compute by downloading every
    // instance. `mine=1` scopes to the caller, which is what the dashboard cards want.
    summary: asyncHandler(async (req: Request, res: Response) => {
        const { definitionId, storeId, assigneeId, mine } = req.query
        const scopedToSelf = mine === "1" || mine === "true"
        // Only ADMIN/PC may ask for org-wide numbers; everyone else is pinned to their own, so
        // this can't be used to read another store's compliance by dropping `mine`.
        const isOrgWide = req.user!.role === "ADMIN" || req.user!.role === "PC"
        const data = await checklistInstanceService.summary({
            definitionId: definitionId as string | undefined,
            storeId: storeId as string | undefined,
            assigneeId: assigneeId as string | undefined,
            userId: scopedToSelf || !isOrgWide ? req.user!.sub : undefined,
        })
        res.json({ success: true, data })
    }),

    getOne: asyncHandler(async (req: Request, res: Response) => {
        const instance = await checklistInstanceService.getById(req.params.id, req.user!)
        res.json({ success: true, data: instance })
    }),

    setItemDone: asyncHandler(async (req: Request, res: Response) => {
        const { isDone, ...values } = setChecklistInstanceItemDoneSchema.parse(req.body)
        const item = await checklistInstanceService.setItemDone(req.params.id, isDone, req.user!, values)
        res.json({ success: true, data: item })
    }),

    // PATCH /checklist-instances/:id/verify (PC own-department / ADMIN all)
    verify: asyncHandler(async (req: Request, res: Response) => {
        const input = verifyChecklistInstanceSchema.parse(req.body)
        const instance = await checklistInstanceService.verify(req.params.id, input, req.user!)
        res.json({ success: true, data: instance })
    }),

    // GET /checklist-instances/reports/compliance?groupBy=&storeId=&from=&to=
    // ADMIN/PC may pass any storeId (or none, for org-wide). SENIOR is forced to their own
    // store regardless of what's in the query — a SENIOR must never be able to read another
    // store's data by passing a different storeId. MANAGER has no store of their own, but their
    // department can optionally have a home store (Department.storeId) — resolve it so a
    // department head's checklist view isn't just org-wide.
    complianceReport: asyncHandler(async (req: Request, res: Response) => {
        const query = checklistInstanceComplianceReportQuerySchema.parse(req.query)
        const { storeId: baseStoreId } = resolveReportScope(req.user!, { storeId: query.storeId })
        const storeId = req.user!.role === "MANAGER" && req.user!.departmentId
            ? await resolveStoreIdForDepartment(req.user!.departmentId)
            : baseStoreId;
        const data = await checklistInstanceService.complianceReport(query.groupBy, storeId, query.from, query.to)
        res.json({ success: true, data })
    }),
}
