import { api } from "~/trpc/react";

export function useUserInfoData() {
  const userInfoQuery = api.post.userInfo.useQuery();

  return {
    userInfoQuery,
    userWeight: userInfoQuery.data?.weight ?? null,
    userSex: userInfoQuery.data?.sex ?? null,
    hasUserInfo: !!(userInfoQuery.data?.weight && userInfoQuery.data?.sex),
  };
}