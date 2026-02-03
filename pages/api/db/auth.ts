import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { branch, password } = req.body;
  const masterPw = process.env.MASTER_PW;
  
  // 마스터 체크
  if (branch === '마스터' && password === masterPw) {
    return res.status(200).json({ success: true, isMaster: true });
  }

  // 지점별 체크 (BRANCH_PW_1 ~ 8 매칭)
  const branches = ['본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];
  const branchIdx = branches.indexOf(branch);
  const correctPw = process.env[`BRANCH_PW_${branchIdx + 1}`];

  if (branchIdx !== -1 && password === correctPw) {
    return res.status(200).json({ success: true, isMaster: false });
  }

  return res.status(401).json({ success: false });
}
