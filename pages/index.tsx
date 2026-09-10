import { getServerSession } from "next-auth/next";
import type { GetServerSideProps } from "next";
import { authOptions } from "./api/auth/[...nextauth]";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  return {
    redirect: {
      destination: session?.user?.id ? "/tracker" : "/auth/signin",
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
