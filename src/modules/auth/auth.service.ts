import bcrypt from "bcrypt";
import { prisma } from "../../core/prisma";

export async function registerUser(input: {
  name: string;
  username: string;
  email?: string;
  password: string;
}) {
  const existingUsername = await prisma.user.findUnique({
    where: {
      username: input.username,
    },
  });

  if (existingUsername) {
    throw new Error("USERNAME_ALREADY_EXISTS");
  }

  if (input.email) {
    const existingEmail = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingEmail) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      status: true,
      preferredLanguage: true,
      createdAt: true,
    },
  });

  return user;
}