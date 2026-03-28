import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import cohortsRouter from "./cohorts";
import submissionsRouter from "./submissions";
import startupsRouter from "./startups";
import invitesRouter from "./invites";
import slotAssignmentsRouter from "./slot-assignments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(cohortsRouter);
router.use(submissionsRouter);
router.use(startupsRouter);
router.use(invitesRouter);
router.use(slotAssignmentsRouter);

export default router;
