import { NextRequest } from "next/server";
import { GET as getQuestions } from "@/app/api/questions/route";

export async function GET(request: NextRequest) {
  return getQuestions(request);
}
