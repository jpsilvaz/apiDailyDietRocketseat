import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knex } from "../database";

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string().email(),
    })

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
    }

    const { name, email } = createUserBodySchema.parse(request.body)

    const userByEmail = await knex('users').where('email', email).first()

    if (userByEmail) {
      return reply.status(400).send({
        message: 'User already exists'
      })
    }

    await knex('users').insert({
      id: randomUUID(),
      name,
      email,
      session_Id: sessionId,
    })

    reply.status(201).send()
  })
}