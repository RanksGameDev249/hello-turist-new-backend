import { Request, Response } from "express";

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.schema";

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllUserSessions,
  deleteUserAccount,
} from "./auth.service";

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration data",
      },
      requestId: req.requestId,
    });
  }

  try {
    const user = await registerUser(parsed.data);

    return res.status(201).json({
      success: true,
      data: {
        user,
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USERNAME_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: "USERNAME_ALREADY_EXISTS",
            message: "Username is already registered",
          },
          requestId: req.requestId,
        });
      }

      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "Email is already registered",
          },
          requestId: req.requestId,
        });
      }
    }

    console.error("REGISTER_ERROR:", error);

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

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login data",
      },
      requestId: req.requestId,
    });
  }

  try {
    const result = await loginUser(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid username/email or password",
          },
          requestId: req.requestId,
        });
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return res.status(403).json({
          success: false,
          data: null,
          error: {
            code: "ACCOUNT_NOT_ACTIVE",
            message: "Account is not active",
          },
          requestId: req.requestId,
        });
      }
    }

    console.error("LOGIN_ERROR:", error);

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

export async function refresh(req: Request, res: Response) {
  const parsed = refreshTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid refresh token",
      },
      requestId: req.requestId,
    });
  }

  try {
    const tokens = await refreshAccessToken(parsed.data.refreshToken);

    return res.status(200).json({
      success: true,
      data: tokens,
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "INVALID_REFRESH_TOKEN" ||
        error.message === "REFRESH_TOKEN_REVOKED" ||
        error.message === "REFRESH_TOKEN_EXPIRED"
      ) {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: error.message,
            message: "Invalid or expired refresh token",
          },
          requestId: req.requestId,
        });
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return res.status(403).json({
          success: false,
          data: null,
          error: {
            code: "ACCOUNT_NOT_ACTIVE",
            message: "Account is not active",
          },
          requestId: req.requestId,
        });
      }
    }

    console.error("REFRESH_ERROR:", error);

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
export async function logout(req: Request, res: Response) {
  const parsed = refreshTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid refresh token",
      },
      requestId: req.requestId,
    });
  }

  try {
    await logoutUser(parsed.data.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully",
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_REFRESH_TOKEN"
    ) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        },
        requestId: req.requestId,
      });
    }

    console.error("LOGOUT_ERROR:", error);

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

export async function logoutAll(
  req: Request,
  res: Response
) {
  try {
    await logoutAllUserSessions(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        message: "Logged out from all devices",
      },
      error: null,
      requestId: req.requestId,
    });
  } catch (error) {
    console.error("LOGOUT_ALL_ERROR:", error);

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

export async function deleteAccount(req: Request, res: Response) {
  try {
    await deleteUserAccount(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        message: "Account deleted successfully",
      },
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

      if (error.message === "ACCOUNT_ALREADY_DELETED") {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: "ACCOUNT_ALREADY_DELETED",
            message: "Account has already been deleted",
          },
          requestId: req.requestId,
        });
      }
    }

    console.error("DELETE_ACCOUNT_ERROR:", error);

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