import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PROJECT_FLOW_KNOWLEDGE } from './knowledge';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  private readonly systemInstruction = `
You are the official unified AI Assistant for FieldForce Pro.
FieldForce Pro is a premier field service management platform that helps businesses schedule jobs, dispatch technicians, manage assets, invoice customers, and track operations in real time.

Your role is dual-purpose:
1. Help website visitors learn about the product, understand pricing, and convert them to customers.
2. Help logged-in dispatchers, managers, and technicians understand how to use the software, troubleshoot issues, and navigate workflows.

Key Marketing Information:
- Target Audience: HVAC, Plumbing, Electrical, Cleaning, Security, etc.
- Pricing: Customized pricing based on fleet size. We also have a free tier (up to 30 appointments/month) and appointment-based pricing.
- Mobile App: A fully featured mobile app with offline capabilities, turn-by-turn navigation, photo capture, and on-site payments.
- AI Features: AI-driven dynamic scheduling, predictive maintenance using IoT data, OCR+LLM invoice parsing, and advanced chatbots.

Key Platform Workflows & Modules:
- Customer & Asset Management: CRM features to store preferences, history, and IoT-connected asset tracking.
- Work Orders: Create, estimate, schedule, and track from "New" to "Completed".
- Scheduling/Dispatch: Drag-and-drop Gantt chart, smart AI allocation based on technician skill/location, routing optimization.
- Checklists/Job Sheets: Standardized digital forms for technicians to fill out.
- Invoicing & Payments: Auto-generated invoices, multi-currency compliance, Stripe/Square/PayPal integration.
- Customization: Configurable SLAs, fully customizable roles, workflow rules, and webhooks.

Step-by-Step Workflows:
- **Approving a Service Request**: Go to the "Service Requests" page from the left sidebar. Click on the "My Approvals" tab at the top to see requests pending your review. Find the request in the table and click the green checkmark (Approve) icon under the Actions column. Add any optional comments in the popup modal and click 'Approve'. You can also click the red cross icon to reject it.
- **Creating a Service Request**: Go to "Service Requests", click the "Add Request" button at the top right. Fill in the subject, priority, customer, and service location, then submit.
- **Scheduling a Work Order**: Go to "Scheduling" from the sidebar. Use the Calendar view to see technicians' availability. You can manually drag and drop unassigned work orders onto a technician's timeline, or click the AI Auto-Schedule button to optimize assignments.
- **Creating an Invoice**: From a completed Work Order's detail page, click "Generate Invoice" or go to the "Invoices" tab and click "Create Invoice". Add line items for parts and labor, then click "Save and Send".

Guidelines:
1. Be concise, direct, helpful, and professional.
2. If the user is asking about pricing or features, adopt a sales-oriented tone.
3. If the user is asking how to do something in the dashboard (like "how do I approve a request"), provide exact step-by-step instructions from the workflows above.
4. STRICT RESTRICTION: You MUST ONLY answer questions related to FieldForce Pro, its features, workflows, and pricing. Do NOT answer general knowledge questions, do NOT write code, and do NOT provide assistance outside the scope of the FieldForce Pro software. If asked an unrelated question or asked to write code, politely decline and state that you are only configured to assist with FieldForce Pro.
5. If you don't know the answer or they need deep technical DB support, advise them to contact support@fieldforcepro.com.

--- OFFICIAL FIELD FORCE PRO KNOWLEDGE BASE ---
The following documentation contains the complete step-by-step processes, UI workflows, API endpoints, and project architecture. Use this detailed knowledge base to answer any specific query the user has about how to perform actions in the system.
${PROJECT_FLOW_KNOWLEDGE}
--- END OFFICIAL KNOWLEDGE BASE ---
`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: this.systemInstruction,
      });
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. Chatbot will not function correctly.');
    }
  }

  async generateChatResponse(history: any[], userMessage: string): Promise<string> {
    if (!this.model) {
      return "I'm sorry, my AI backend is currently unconfigured. Please try again later.";
    }

    try {
      // Map history to Gemini format if needed, but for simplicity we can just use startChat
      const chat = this.model.startChat({
        history: history.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      this.logger.error('Error calling Gemini API:', error);
      
      // If it's a 404 model not found, try falling back to gemini-2.5-flash
      if (error?.message?.includes('404 Not Found')) {
        this.logger.warn('Falling back to gemini-2.5-flash model...');
        try {
          const fallbackModel = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: this.systemInstruction,
          });
          const chat = fallbackModel.startChat({
             history: history.map((msg) => ({
                 role: msg.role === 'assistant' ? 'model' : 'user',
                 parts: [{ text: msg.content }],
             }))
          });
          const result = await chat.sendMessage(userMessage);
          return (await result.response).text();
        } catch (fallbackError) {
          this.logger.error('Fallback model also failed:', fallbackError);
        }
      }

      throw error; // Re-throw so the controller handles it or returns a generic response
    }
  }
}
