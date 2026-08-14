import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/?auth=signup&next=%2Freal-interview");
}
