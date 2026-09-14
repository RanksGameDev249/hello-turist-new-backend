import { Request, Response } from "express";
import { updateRoleVerificationSchema } from "./admin.schema";
import { updateRoleVerification } from "./admin.service";

export async function updateUserRoleVerification(
  req: Request,
  res: Response
) {
  try {
   const userId = Array.isArray(req.params.userId)
  ? req.params.userId[0]
  : req.params.userId;

const role = (
  Array.isArray(req.params.role) ? req.params.role[0] : req.params.role
)?.toUpperCase();

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_REQUEST",
          message: "userId and role are required",
        },
        requestId: req.requestId,
      });
    }

    if (role !== "DRIVER" && role !== "GUIDE") {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_ROLE",
          message: "Only DRIVER or GUIDE roles can be verified",
        },
        requestId: req.requestId,
      });
    }

    const parsed = updateRoleVerificationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
        requestId: req.requestId,
      });
    }

    const result = await updateRoleVerification(
      userId,
      role,
      parsed.data.verificationStatus
    );

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          data: null,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
          requestId: req.requestId,
        });
      }

      if (error.message === "ROLE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          data: null,
          error: {
            code: "ROLE_NOT_FOUND",
            message: "Requested role not found for this user",
          },
          requestId: req.requestId,
        });
      }
    }

    console.error("ADMIN_ROLE_VERIFICATION_ERROR:", error);

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      requestId: req.requestId,
    });
  }
}