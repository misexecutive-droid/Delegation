import { Router } from "express"
import { checklistInstanceItemSubmissionImageController } from "./checklistInstanceItemSubmissionImage.controller.js"
import { authenticate } from "../../middleware/auth/auth.js"

export const checklistInstanceItemSubmissionImageRouter = Router()
checklistInstanceItemSubmissionImageRouter.use(authenticate)
checklistInstanceItemSubmissionImageRouter.delete('/:id', checklistInstanceItemSubmissionImageController.remove)
