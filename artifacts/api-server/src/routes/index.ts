import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(botRouter);
router.use(adminRouter);

export default router;
