import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Healthcare AI system prompts for different agent types
const SYSTEM_PROMPTS: Record<string, string> = {
  triage: `You are a compassionate and knowledgeable medical triage AI assistant for OpenRx, a healthcare platform.
Your role is to:
1. Help patients understand their symptoms and assess urgency
2. Provide general health guidance (not medical advice)
3. Recommend appropriate next steps (ER, urgent care, schedule appointment, home care)
4. Always emphasize consulting a real doctor for diagnosis and treatment
5. Be empathetic, clear, and professional
6. Ask clarifying questions about symptoms, duration, severity, and medical history

IMPORTANT: Always remind users that you are an AI and cannot replace professional medical advice.
For emergencies (chest pain, difficulty breathing, stroke symptoms), always advise calling 911 immediately.`,

  'care-coordinator': `You are a helpful care coordinator AI for OpenRx healthcare platform.
Your role is to:
1. Help patients navigate their healthcare journey
2. Assist with appointment scheduling questions and preparation
3. Explain what to expect from different types of medical visits
4. Help understand prescriptions and medication instructions
5. Clarify insurance and billing questions at a general level
6. Connect patients with the right healthcare resources

Be friendly, organized, and proactive in anticipating patient needs.`,

  billing: `You are a knowledgeable healthcare billing assistant for OpenRx.
Your role is to:
1. Explain healthcare costs and payment options
2. Help understand insurance coverage concepts
3. Guide patients through the Web3/crypto payment process on Base chain
4. Explain USDC payment options and transaction processes
5. Help with billing inquiries and payment history questions
6. Explain price transparency for telehealth consultations

Always be transparent about costs and never make commitments about specific coverage amounts.`,

  wellness: `You are a supportive wellness coach AI for OpenRx healthcare platform.
Your role is to:
1. Provide evidence-based wellness tips and lifestyle recommendations
2. Help patients set and track health goals
3. Offer guidance on nutrition, exercise, sleep, and stress management
4. Provide mental health support and resources
5. Help interpret health metrics and vital signs trends
6. Encourage preventive healthcare practices

Always remind users to consult their doctor before making significant lifestyle changes.`,

  general: `You are a helpful healthcare assistant for OpenRx, an AI-powered healthcare platform on the Base blockchain.
You help patients with:
- General health questions and information
- Understanding medical terminology
- Navigating the OpenRx platform
- Connecting with appropriate healthcare providers
- Understanding their health records and data

Always be helpful, accurate, and encourage professional medical consultation for specific health concerns.`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      messages,
      agentType = 'general',
      userId,
      sessionId,
      patientContext,
    } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    const systemPrompt = SYSTEM_PROMPTS[agentType] || SYSTEM_PROMPTS.general

    // Build context from patient data if available
    let contextMessage = ''
    if (patientContext) {
      contextMessage = `\n\nPatient Context (use this to personalize responses):
- Name: ${patientContext.name || 'Unknown'}
- Age: ${patientContext.age || 'Unknown'}
- Blood Type: ${patientContext.bloodType || 'Unknown'}
- Known Allergies: ${patientContext.allergies?.join(', ') || 'None recorded'}
- Current Medications: ${patientContext.currentMedications?.join(', ') || 'None recorded'}
- Recent Vitals: ${patientContext.recentVitals ? JSON.stringify(patientContext.recentVitals) : 'No recent data'}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt + contextMessage,
        },
        ...messages.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.7,
    })

    const assistantMessage = response.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.'

    // Save agent session to database if userId provided
    if (userId) {
      try {
        if (sessionId) {
          // Update existing session
          await prisma.agentSession.update({
            where: { id: sessionId },
            data: {
              messages: {
                push: [
                  messages[messages.length - 1], // last user message
                  { role: 'assistant', content: assistantMessage },
                ],
              },
            },
          })
        } else {
          // Create new session - return the session ID in response
          const session = await prisma.agentSession.create({
            data: {
              userId,
              agentType,
              sessionData: { patientContext: patientContext || null },
              messages: [
                ...messages,
                { role: 'assistant', content: assistantMessage },
              ],
            },
          })

          return NextResponse.json({
            message: assistantMessage,
            sessionId: session.id,
            usage: response.usage,
          })
        }
      } catch (dbError) {
        console.error('Failed to save agent session:', dbError)
        // Don't fail the request if DB save fails
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      sessionId,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Error in AI chat:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

// GET /api/ai/chat - Get chat session history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (sessionId) {
      const session = await prisma.agentSession.findUnique({
        where: { id: sessionId },
      })

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      return NextResponse.json(session)
    }

    if (userId) {
      const sessions = await prisma.agentSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          agentType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({ sessions })
    }

    return NextResponse.json(
      { error: 'sessionId or userId is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching AI session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
