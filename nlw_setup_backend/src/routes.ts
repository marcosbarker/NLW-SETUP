import {FastifyInstance} from "fastify"
import { prisma } from "./lib/prisma"
import {z} from 'zod'
import dayjs from 'dayjs'
import { request } from "http"

export async function appRoutes(app: FastifyInstance) {
    app.post('/habits', async (request) => {
        const createHabitBody = z.object({
            title: z.string(),
            weekDays: z.array(
                z.number().min(0).max(6)
            )
        })

        const {title, weekDays} = createHabitBody.parse(request.body)
        const today = dayjs().startOf('day').toDate()

        await prisma.habit.create({
            data: {
                title,
                created_at: today,
                weekDays: {
                    create: weekDays.map(weekDay => {
                        return {
                            week_day: weekDay
                        }
                    }) 
                }
            }
        })
    })

    app.get('/day', async (request) => {
        const getdayParams = z.object({
            date: z.coerce.date()
        })
        const {date} = getdayParams.parse(request.query)
        const pasrseddate = dayjs(date).startOf('day')
        const weekDay = pasrseddate.get('day')
        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at: {
                    lte: date
                },
                weekDays: {
                   some: {
                       week_day: weekDay
                   } 
                }
            }
        })
        const day = await prisma.day.findUnique({
            where: {
                date: pasrseddate.toDate()
            },
            include: {
                dayHabits: true
            }
        })

        const completedHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id
        })

        return {
            possibleHabits
        }
    })
}
