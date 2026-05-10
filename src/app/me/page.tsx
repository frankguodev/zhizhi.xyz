import { redirect } from "next/navigation";

export const metadata = {
  title: "个人中心暂未开放",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MePage() {
  redirect("/");
}
