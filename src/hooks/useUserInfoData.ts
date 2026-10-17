import { api } from "~/trpc/react";

export function useUserInfoData(enabled = true) {
  const userInfoQuery = api.post.userInfo.useQuery(undefined, { enabled });

  return {
    userInfoQuery,
    userWeight: userInfoQuery.data?.weight ?? null,
    userSex: userInfoQuery.data?.sex ?? null,
    hasUserInfo: !!(userInfoQuery.data?.weight && userInfoQuery.data?.sex),
  };
}
