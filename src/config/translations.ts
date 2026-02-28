export type Lang = 'zh' | 'en';

type Keys =
  | 'hero_title'
  | 'hero_subtitle'
  | 'hero_cta_primary'
  | 'hero_cta_secondary'
  | 'feature1_title'
  | 'feature1_body'
  | 'feature2_title'
  | 'feature2_body'
  | 'feature3_title'
  | 'feature3_body'
  | 'feature4_title'
  | 'feature4_body'
  | 'steps_title'
  | 'step1'
  | 'step2'
  | 'step3';

type Dict = Record<Keys, string>;

export const zh: Dict = {
  hero_title: '美国租房合同，看懂再签',
  hero_subtitle: 'AI 帮你识别合同里的隐藏风险，中文解读，几分钟搞定',
  hero_cta_primary: '立即上传我的租约',
  hero_cta_secondary: '先看看示例报告',

  feature1_title: '留学生',
  feature1_body: '第一次在美国租房，密密麻麻的英文合同看着头疼，怕漏掉关键条款',
  feature2_title: '刚工作的年轻人 / 访问学者',
  feature2_body: '时间紧，没精力逐条啃合同，只想知道哪里要小心',
  feature3_title: '家长',
  feature3_body: '孩子在美国租房，想帮忙把把关，但看不懂那些法律术语',
  feature4_title: '上传合同，AI 帮你审查',
  feature4_body: '重点分析滞纳金、押金、提前解约、涨租续约等条款，生成中文风险报告',

  steps_title: '怎么用？',
  step1: '第一步：上传合同 — 支持 PDF 或图片，手机拍照即可',
  step2: '第二步：等待分析 — AI 自动识别关键条款，标记风险等级',
  step3: '第三步：查看报告 — 几分钟内生成中文总结，重点条款有解释',
};

export const en: Dict = {
  hero_title: 'Worried about U.S. rental scams? Let AI review your lease first',
  hero_subtitle: 'Built for Chinese students and parents. Upload your lease and get a bilingual risk report in 3 minutes, covering deposit, termination, eviction and more.',
  hero_cta_primary: 'Upload my lease',
  hero_cta_secondary: 'View sample report',

  feature1_title: 'Don\'t read legal English? We translate key clauses into plain language',
  feature1_body: 'The AI extracts deposit, penalty, rent increase and eviction clauses, explains them in simple Chinese, and shows the original English so you can negotiate confidently.',
  feature2_title: 'Spot "gotcha" clauses before you sign',
  feature2_body: 'Risky terms like "anytime entry", "non‑refundable deposit" or high break fees are highlighted with practical negotiation tips.',
  feature3_title: 'Peace of mind for parents abroad',
  feature3_body: 'Parents can upload the lease or view shared reports to help decide whether to sign, even from outside the U.S.',
  feature4_title: 'Pay once',
  feature4_body: 'Choose a single review or a plan that covers multiple leases and renewals throughout the academic year.',

  steps_title: '3 steps to check your lease',
  step1: '1. Upload your lease as PDF or images',
  step2: '2. Wait ~3 minutes for your bilingual report',
  step3: '3. Use the recommendations to negotiate or decide whether to sign',
};
