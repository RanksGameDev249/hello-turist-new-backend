import { Request, Response } from "express";

import { getCurrentUser, updateCurrentUser,  getUserRoles, addUserRole, updateUserRole,  } from "./users.service";
import { updateMeSchema, addRoleSchema, updateRoleSchema, } from "./users.schema";

export async function getMe(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user.id;

    const user = await getCurrentUser(userId);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_NOT_FOUND"
    ) {
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

    console.error("GET_ME_ERROR:", error);

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

export async function updateMe(
  req: Request,
  res: Response
) {
  const parsed = updateMeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid update data",
      },
      requestId: req.requestId,
    });
  }

  try {
    const user = await updateCurrentUser(
      req.user.id,
      parsed.data
    );

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_NOT_FOUND"
    ) {
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

    console.error("UPDATE_ME_ERROR:", error);

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


export async function getRoles(
  req: Request,
  res: Response
) {
  try {
    const roles = await getUserRoles(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        roles,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    console.error("GET_ROLES_ERROR:", error);

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

export async function addRole(
  req: Request,
  res: Response
) {
  const parsed = addRoleSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid role",
      },
      requestId: req.requestId,
    });
  }

  try {
    const role = await addUserRole(
      req.user.id,
      parsed.data.role
    );

    return res.status(201).json({
      success: true,
      data: {
        role,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ROLE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: "ROLE_ALREADY_EXISTS",
          message: "Role already exists",
        },
        requestId: req.requestId,
      });
    }

    console.error("ADD_ROLE_ERROR:", error);

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

export async function updateRole(
  req: Request,
  res: Response
) {
  const parsed = updateRoleSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid role update data",
      },
      requestId: req.requestId,
    });
  }

  const role =
    typeof req.params.role === "string"
      ? req.params.role.toUpperCase()
      : undefined;

  if (
    role !== "RIDER" &&
    role !== "DRIVER" &&
    role !== "GUIDE"
  ) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "INVALID_ROLE",
        message: "Invalid role",
      },
      requestId: req.requestId,
    });
  }

  try {
    const updatedRole = await updateUserRole(
      req.user.id,
      role,
      parsed.data.verificationStatus
    );

    return res.status(200).json({
      success: true,
      data: {
        role: updatedRole,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: "ROLE_NOT_FOUND",
          message: "User does not have this role",
        },
        requestId: req.requestId,
      });
    }

    console.error("UPDATE_ROLE_ERROR:", error);

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

