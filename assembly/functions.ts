import { http } from "@hypermode/modus-sdk-as";
import { Content } from "@hypermode/modus-sdk-as/assembly/http";
import { JSON } from "json-as";

@json
export class NewsSource {
  id: string = "";
  name: string = "";
}

@json
export class NewsArticle {
  url: string = "";
  title: string = "";
  description: string = "";
  content: string = "";
  publishedAt: string = "";
  source: NewsSource = new NewsSource();
}

@json
export class NewsAPIResponse {
  status: string = "";
  totalResults: i32 = 0;
  articles: NewsArticle[] = [];
}

@json
export class NewsSearchParams {
  query: string = "";
  sortBy: string = "relevancy";
}

@json
export class MessageClassification {
  type: string = "";
  reply: string = "";
  searchParams: NewsSearchParams = new NewsSearchParams();
}

@json
export class OpenAIMessage {
  role: string = "";
  content: string = "";
}

@json
export class OpenAIResponseFormat {
  type: string = "json_object";
}

@json
export class OpenAIChatInput {
  model: string = "gpt-4o-mini";
  messages: OpenAIMessage[] = [];
  response_format: OpenAIResponseFormat = new OpenAIResponseFormat();
}

@json
export class OpenAIChoice {
  message: OpenAIMessage = new OpenAIMessage();
}

@json
export class OpenAIResponse {
  choices: OpenAIChoice[] = [];
}

@json
export class SummaryResponse {
  summary: string = "";
}
const CLASSIFICATION_SYSTEM_PROMPT = `
For context: Today's date is ${new Date(Date.now()).toDateString()}.

You are a message classifier that determines if a user's message requires news search or a general response.
You will be provided with the entire chat history, but focus primarily on the most recent message to determine the user's current intent.

Classify the conversation based on the latest message into one of two types:
1. expects_general_reply - when the latest message just needs a conversational response
2. expects_to_search_news - when the latest message is asking about news or current events

Response must be a JSON object with this structure:
{
  "type": "expects_general_reply" | "expects_to_search_news",
  "reply": string (only if type is expects_general_reply),
  "searchParams": {
    "query": string (should just be keywords, not a full sentence as few words as possible),
    "sortBy": "relevancy" | "popularity" | "publishedAt"
  } (only if type is expects_to_search_news)
}

Consider the context of the entire conversation, but prioritize the intent of the most recent message.
Ensure the response is valid JSON and matches the exact structure above.`;

const NEWS_SUMMARY_SYSTEM_PROMPT = `You are a news summarizer. Given a collection of news articles, create a concise, informative summary that:
1. Highlights the key points and common themes
2. Maintains objectivity and factual accuracy
3. Includes relevant dates and sources
4. Is written in a clear, journalistic style
5. Small 2 line intro and outro
5. Use bullet points and short sentences to make them easier to read

Your response must be a JSON object with this structure:
{
  "summary": "your summary text here"
}
`;

export function classifyMessage(message: string): MessageClassification {
  const request = new http.Request('https://api.openai.com/v1/chat/completions');
  request.headers.append("Content-Type", "application/json");
  
  const messages: OpenAIMessage[] = [
    { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
    { role: "user", content: message }
  ];
  
  const requestBody = new OpenAIChatInput();
  requestBody.messages = messages;
  
  const options = new http.RequestOptions();
  options.method = "POST";
  options.body = Content.from(JSON.stringify(requestBody));
  
  const response = http.fetch(request, options);
  if (response.status !== 200) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const openAIResponse = JSON.parse<OpenAIResponse>(response.text());
  return JSON.parse<MessageClassification>(openAIResponse.choices[0].message.content);
}

export function searchNews(query: string, sortBy: string): NewsAPIResponse {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=${sortBy}&pageSize=6`;
  const request = new http.Request(url);
  const response = http.fetch(request);
  
  if (response.status !== 200) {
    throw new Error(`News API error: ${response.statusText}`);
  }
  
  return JSON.parse<NewsAPIResponse>(response.text());
}

export function summarizeNews(articles: NewsArticle[]): string {
  const request = new http.Request('https://api.openai.com/v1/chat/completions');
  request.headers.append("Content-Type", "application/json");  
  const messages: OpenAIMessage[] = [
    { role: "system", content: NEWS_SUMMARY_SYSTEM_PROMPT},
    { role: "user", content: JSON.stringify(articles) }
  ];
  
  const requestBody = new OpenAIChatInput();
  requestBody.messages = messages;
  requestBody.response_format = { type: "json_object" };
  
  const options = new http.RequestOptions();
  options.method = "POST";
  options.body = Content.from(JSON.stringify(requestBody));
  
  const response = http.fetch(request, options);
  if (response.status !== 200) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const openAIResponse = JSON.parse<OpenAIResponse>(response.text());
  const summaryResponse = JSON.parse<SummaryResponse>(openAIResponse.choices[0].message.content);
  return summaryResponse.summary;
} 