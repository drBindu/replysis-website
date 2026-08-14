import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/?auth=signin&next=%2Freal-interview");
}
