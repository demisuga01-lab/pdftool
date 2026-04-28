import { redirect } from "next/navigation";

export default function ImageCompressRedirect() {
  redirect("/compress?type=image");
}
