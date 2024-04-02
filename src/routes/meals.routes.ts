import { FastifyInstance } from "fastify";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";
import { z } from "zod";
import { knex } from "../database";
import { randomUUID } from "crypto";

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/', 
    { 
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnTheDiet: z.boolean(),
        date: z.coerce.date()
      })

      const { name, description, isOnTheDiet, date } = createMealBodySchema.parse(request.body)

      await knex('meals').insert({
        id: randomUUID(),
        name,
        description,
        is_on_the_diet: isOnTheDiet,
        date: date.getTime(),
        user_id: request.user?.id 
      })

      return reply.status(201).send()
    }
  ) // create meal

  app.get(
    '/', 
    {
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const meals = await knex('meals')
        .where("user_id", request.user?.id)
        .orderBy('date', 'desc')
      return reply.send(meals)
    }
  ) // list meals

  app.get(
    '/:mealId',
    { 
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const mealParamsSchema = z.object({mealId: z.string().uuid()})

      const { mealId } = mealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({id: mealId }).first()

      if (!mealId) {
        return reply.status(404).send({
          error: 'Meal not found'
        })
      }

      return reply.send({ meal })
    }
  ) // view single meal

  app.put(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const mealParamsSchema = z.object({mealId: z.string().uuid()})

      const { mealId } = mealParamsSchema.parse(request.params)

      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnTheDiet: z.boolean(),
        date: z.coerce.date()
      })

      const { name, description, isOnTheDiet, date } = updateMealBodySchema.parse(request.body)

      const meal = await knex('meals').where({ id: mealId }).first()

      if (!meal) {
        return reply.status(404).send({
          error: 'Meal not found'
        })
      }

      await knex('meals').where({ id: mealId }).update({
        name,
        description,
        is_on_the_diet: isOnTheDiet,
        date: date.getTime()
      })

      return reply.status(204).send()
    }
  ) // update meal

  app.delete(
    '/:mealId',
    {
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const mealParamsSchema = z.object({ mealId: z.string().uuid() })

      const { mealId } = mealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id: mealId }).first()

      if (!meal) {
        return reply.status(404).send({
          error: 'Meal not found'
        })
      }

      await knex('meals').where({ id: mealId }).delete()

      return reply.status(204).send()
    }
  ) // delete meal 

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
      const totalMealsOnDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_the_diet: true })
        .count('id', { as: 'total' })
        .first()

      const totalMealsOffDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_the_diet: false })
        .count('id', { as: 'total' })
        .first()

      const totalMeals = await knex('meals')
        .where({ user_id: request.user?.id })
        .orderBy('date', 'desc')

      const { bestOnDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_on_the_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }
  
          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence
          }
  
          return acc
        },
        { bestOnDietSequence: 0, currentSequence: 0 },
      )

      return reply.send({
        totalMeals: totalMeals.length,
        totalMealsOnDiet: totalMealsOnDiet?.total,
        totalMealsOffDiet: totalMealsOffDiet?.total,
        bestOnDietSequence,
      })
    }
  ) // metrics meals
}