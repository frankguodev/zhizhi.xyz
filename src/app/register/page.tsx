import { redirect } from "next/navigation";

export const metadata = {
  title: "注册暂未开放",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  redirect("/");
}
