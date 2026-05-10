import { redirect } from "next/navigation";

export const metadata = {
  title: "阅读历史暂未开放",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HistoryPage() {
  redirect("/");
}
