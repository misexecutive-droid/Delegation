import { type Request , type Response } from "express";
import { departmentService } from "./department.service.js";
import { createDepartmentSchema , updateDepartmentSchema, listDepartmentsQuerySchema } from "./department.validation.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const departmentController = {

    // GET /departments -> any authenticated user can list departmetns (e.g. to pick one on a ticket. )
    // page/limit are both optional - when neither is sent this responds with the exact same
    // { success, data } shape as before (see listDepartmentsQuerySchema / departmentService.list).
    list : asyncHandler( async (req : Request , res : Response) => {
        const { page, limit } = listDepartmentsQuerySchema.parse(req.query)
        const result = await departmentService.list(page, limit)
        res.json({ success : true , ...result})
    }),

    // GET /departments/:id -> any auth
    // enticated user can view a single department.
    getOne : asyncHandler(async ( req : Request , res : Response) => {
        const department = await departmentService.getById(req.params.id)
        res.json({ success : true, data : department})
    }),

    // POST /departments -> ADMIN only(enforced in department.routes.ts).
    create : asyncHandler(async ( req : Request , res : Response) => {
        const input = createDepartmentSchema.parse(req.body)
        const department = await departmentService.create(input)
        res.status(201).json({ success : true , data : department})
    }),

    update : asyncHandler(async (req : Request , res : Response) => {
        const input = updateDepartmentSchema.parse(req.body)
        const department = await departmentService.update(req.params.id, input)
        res.json({success : true, data : department})

    }),

    // DELETE /departments/:id  -> ADMIN only.
    remove : asyncHandler(async (req : Request, res : Response) => {
        await departmentService.remove(req.params.id)
        res.json({ success : true, data : { deleted : true}})
    }),


}