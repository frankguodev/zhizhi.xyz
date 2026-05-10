import { redirect } from "next/navigation";

export const metadata = {
  title: "收藏暂未开放",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavoritesPage() {
  redirect("/");
}
