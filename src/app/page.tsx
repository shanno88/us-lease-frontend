// src/app/page.tsx
"use client";
import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Globe,
  ChevronRight,
  Loader2,
  Printer,
  X,
  Lock,
  ArrowRight
} from 'lucide-react';
import { zh, en, type Lang } from '@/config/translations';
import { API_BASE_URL } from '@/config/api';
import { useAccessControl } from '@/hooks/useAccessControl';
interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}
interface AnalysisResult {
  summary: string;
  riskScore: number;
  clauses: Array<{
    id: string;
    title: string;
    risk: 'high' | 'medium' | 'low';
    summary: string;
    original?: string;
  }>;
}
export default function Home() {
  const [lang, setLang] = useState<Lang>('zh');
  const t = lang === 'zh' ? zh : en;
  const { isLoading: isCheckingAccess, hasAccess, userId } = useAccessControl();

  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [isSampleReport, setIsSampleReport] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, []);

  const getSampleResult = useCallback((): AnalysisResult => ({
    summary: lang === 'zh'
      ? '这是一份标准的美国公寓租赁合同，整体风险中等。发现了3个需要关注的高风险条款。'
      : 'This is a standard US apartment lease agreement with moderate overall risk. Found 3 high-risk clauses that need attention.',
    riskScore: 62,
    clauses: [
      {
        id: '1',
        title: lang === 'zh' ? '滞纳金条款' : 'Late Fee Clause',
        risk: 'high',
        summary: lang === 'zh'
          ? '逾期付款将收取$50+每日$10的滞纳金，费用偏高。'
          : 'Late payment incurs $50 + $10/day penalty, which is above average.',
        original: 'A late fee of $50 plus $10 per day will be charged...'
      },
      {
        id: '2',
        title: lang === 'zh' ? '提前解约' : 'Early Termination',
        risk: 'high',
        summary: lang === 'zh'
          ? '提前解约需支付2个月租金作为违约金。'
          : 'Early termination requires 2 months rent as penalty.',
        original: 'Tenant shall pay liquidated damages equal to two months rent...'
      },
      {
        id: '3',
        title: lang === 'zh' ? '押金退还' : 'Security Deposit Return',
        risk: 'medium',
        summary: lang === 'zh'
          ? '押金将在搬出后45天内退还，期限偏长。'
          : 'Security deposit will be returned within 45 days of move-out.',
        original: 'Security deposit shall be returned within 45 days...'
      },
      {
        id: '4',
        title: lang === 'zh' ? '维修责任' : 'Maintenance Responsibility',
        risk: 'low',
        summary: lang === 'zh'
          ? '房东负责主要维修，租客负责小修（$100以下）。'
          : 'Landlord handles major repairs, tenant handles minor repairs under $100.',
        original: 'Landlord shall maintain premises in habitable condition...'
      }
    ]
  }), [lang]);

  const handleShowSampleReport = useCallback(() => {
    setIsSampleReport(true);
    setAnalysisResult(getSampleResult());
    showToast(lang === 'zh' ? '已加载示例报告' : 'Sample report loaded', 'info');
  }, [getSampleResult, showToast, lang]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 10) {
      showToast(lang === 'zh' ? '最多上传10张图片' : 'Maximum 10 images allowed', 'error');
      return;
    }
    for (const f of selected) {
      if (f.size > 10 * 1024 * 1024) {
        showToast(lang === 'zh' ? '文件太大，请上传小于10MB的文件' : 'File too large. Please upload a file under 10MB.', 'error');
        return;
      }
    }
    if (selected.length > 0) {
      setFiles(selected.slice(0, 10));
      setAnalysisResult(null);
      setIsSampleReport(false);
      showToast(lang === 'zh' ? `已选择 ${selected.length} 张图片` : `${selected.length} image(s) selected`, 'success');
    }
  };
  const handleAnalyze = async () => {
    setAnalysisResult(null);
    setError(null);

    if (!files?.length) {
      showToast(lang === 'zh' ? '请先上传租约照片' : 'Please upload lease page photos first', 'error');
      return;
    }
    if (!userId) {
      showToast(lang === 'zh' ? '请刷新页面后重试' : 'Please refresh the page and try again', 'error');
      return;
    }
    setIsAnalyzing(true);
    setIsSampleReport(false);
    setCurrentPage(0);

    const riskLevelToScore: Record<string, number> = {
      'low': 25, 'safe': 25,
      'medium': 50, 'caution': 50,
      'high': 75, 'danger': 75
    };

    try {
      const allClauses: Array<Record<string, unknown>> = [];
      let combinedSummary = '';
      let totalRiskScore = 0;

      for (let i = 0; i < files.length; i++) {
        setCurrentPage(i + 1);
        showToast(lang === 'zh' ? `正在分析第 ${i + 1}/${files.length} 张...` : `Analyzing page ${i + 1} of ${files.length}...`, 'info');

        const formData = new FormData();
        formData.append('files', files[i]);

        const url = `${API_BASE_URL}/api/lease/analyze?user_id=${userId}`;
        const response = await fetch(url, { method: 'POST', body: formData });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
          showToast(String(errorData?.detail || errorData?.message || `Page ${i + 1} failed`), 'error');
          continue;
        }

        const data = await response.json();
        if (!data.success) {
          showToast(data.error || `Page ${i + 1} failed`, 'error');
          continue;
        }

        const apiData = data.data || data;
        const clauses = apiData.clauses || [];
        allClauses.push(...clauses);
        if (apiData.summary) {
          const s = apiData.summary;
          combinedSummary = typeof s === 'string' ? s : (s.late_fee_summary_zh || s.early_termination_risk_zh || '');
        }
        if (apiData.risk_score != null) totalRiskScore = Number(apiData.risk_score);
      }

      if (allClauses.length === 0) {
        showToast(lang === 'zh' ? '未能从任何页面提取条款' : 'No clauses extracted from any page', 'error');
        return;
      }

      const avgRisk = totalRiskScore > 0
        ? totalRiskScore
        : allClauses.reduce((acc: number, c: Record<string, unknown>) => {
            const level = String(c.risk_level || 'medium').toLowerCase();
            return acc + (riskLevelToScore[level] || 50);
          }, 0) / allClauses.length;

      const result: AnalysisResult = {
        summary: combinedSummary || (lang === 'zh' ? '合同分析已完成' : 'Lease analysis completed'),
        riskScore: Math.round(avgRisk),
        clauses: allClauses.slice(0, 20).map((clause: Record<string, unknown>, idx: number) => {
          const riskLevel = String(clause.risk_level || 'medium').toLowerCase();
          const mappedRisk: 'high' | 'medium' | 'low' =
            riskLevel === 'high' ? 'high' :
            riskLevel === 'medium' ? 'medium' : 'low';
          return {
            id: `${idx}-${clause.id || clause.clause_id || ''}`,
            title: String(clause.title_en || clause.id || clause.clause_id || ''),
            risk: mappedRisk,
            summary: String(clause.summary_zh || ''),
            original: clause.original_text ? String(clause.original_text) :
              clause.clause_text_en ? String(clause.clause_text_en) : undefined,
          };
        }),
      };

      setAnalysisResult(result);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      showToast(lang === 'zh' ? '分析完成' : 'Analysis complete', 'success');
    } catch (error) {
      console.error('Analysis error:', error);
      showToast(
        lang === 'zh'
          ? `分析失败: ${error instanceof Error ? error.message : '请检查网络连接后重试'}`
          : `Analysis failed: ${error instanceof Error ? error.message : 'Please check your connection and try again.'}`,
        'error'
      );
    } finally {
      setIsAnalyzing(false);
      setCurrentPage(0);
    }
  };
  const handlePrint = () => {
    window.print();
  };
  const getRiskBadgeStyle = (risk: AnalysisResult['clauses'][0]['risk']) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };
  const getRiskLabel = (risk: AnalysisResult['clauses'][0]['risk']) => {
    const labels = {
      zh: { high: '高风险', medium: '中风险', low: '低风险' },
      en: { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk' }
    };
    return labels[lang][risk];
  };

  const getRiskGroupStyle = (risk: 'high' | 'medium' | 'low') => {
    switch (risk) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-amber-50 border-amber-200';
      case 'low': return 'bg-emerald-50 border-emerald-200';
    }
  };

  const groupClausesByRisk = (clauses: AnalysisResult['clauses']) => {
    const high = clauses.filter(c => c.risk === 'high');
    const medium = clauses.filter(c => c.risk === 'medium');
    const low = clauses.filter(c => c.risk === 'low');
    return [
      { risk: 'high' as const, clauses: high },
      { risk: 'medium' as const, clauses: medium },
      { risk: 'low' as const, clauses: low },
    ].filter(g => g.clauses.length > 0);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {isCheckingAccess ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600">
              {lang === 'zh' ? '正在验证访问权限...' : 'Verifying access...'}
            </p>
          </div>
        </div>
      ) : !hasAccess ? (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              {lang === 'zh' ? '访问受限' : 'Access Restricted'}
            </h1>
            <p className="text-slate-600 mb-6">
              {lang === 'zh' 
                ? '此页面需要购买访问权限。请先在 TutorBox 首页购买租约分析服务。'
                : 'This page requires a purchase. Please buy the lease analysis service on the TutorBox homepage first.'}
            </p>
            <a
              href="https://tutorbox.cc/#pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              {lang === 'zh' ? '前往购买' : 'Go to Pricing'}
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      ) : (
        <>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-emerald-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-slate-800 text-white'
          }`}>
          {toast.message}
        </div>
      )}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="https://tutorbox.cc" className="flex items-center gap-2 font-bold text-xl text-slate-900 hover:opacity-80 transition-opacity">
            <Shield className="h-6 w-6 text-indigo-600" />
            TutorBox
          </a>
          <div className="flex items-center gap-4">
            <a
              href="https://tutorbox.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              了解更多 / 价格
            </a>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <Globe className="h-4 w-4" />
              {lang === 'zh' ? '中文' : 'EN'}
            </button>
          </div>
        </div>
      </header>
      <main className="pt-16">
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              {t.hero_title}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              {t.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {t.hero_cta_primary}
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={handleShowSampleReport}
                className="px-6 py-3 bg-white text-slate-700 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t.hero_cta_secondary}
              </button>
            </div>
          </div>
        </section>
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: t.feature1_title, body: t.feature1_body, icon: FileText },
                { title: t.feature2_title, body: t.feature2_body, icon: AlertTriangle },
                { title: t.feature3_title, body: t.feature3_body, icon: Shield },
                { title: t.feature4_title, body: t.feature4_body, icon: Upload }
              ].map((feature, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-12">
              {t.steps_title}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: t.step1, num: 1 },
                { step: t.step2, num: 2 },
                { step: t.step3, num: 3 }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                    {item.num}
                  </div>
                  <p className="text-slate-700">{item.step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="upload-section" className="py-16 px-4 bg-gradient-to-b from-indigo-50 to-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">
              {lang === 'zh' ? '上传合同进行分析' : 'Upload Your Lease for Analysis'}
            </h2>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${files.length ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300'
                  }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${files.length ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {files.length ? (
                    <div className="text-emerald-700">
                      <CheckCircle className="h-5 w-5 inline-block mr-2" />
                      {files.length === 1 ? files[0].name : (lang === 'zh' ? `${files.length} 张图片已选择` : `${files.length} files selected`)}
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-600 mb-2">
                        {lang === 'zh' ? '点击上传或拖拽文件到此处' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-400">
                        {lang === 'zh' ? '最多上传10张租约页照片 (JPG/PNG)' : 'Upload up to 10 lease page photos (JPG/PNG)'}
                      </p>
                    </div>
                  )}
                </label>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!files?.length || isAnalyzing}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${!files?.length || isAnalyzing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'zh' ? '分析中...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    {lang === 'zh' ? '开始分析' : 'Start Analysis'}
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
              
              {isAnalyzing && (
                <>
                  <p className="text-center text-gray-500 mt-4 animate-pulse">
                    {currentPage > 0
                      ? (lang === 'zh' ? `正在分析第 ${currentPage}/${files.length} 张...` : `Analyzing page ${currentPage} of ${files.length}...`)
                      : (lang === 'zh' ? '正在分析租约，请耐心等待...' : 'Analyzing lease, please wait...')}
                  </p>
                  <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <Loader2 className="h-5 w-5 text-indigo-600 animate-spin flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-indigo-900 font-medium">
                          {currentPage > 0
                            ? (lang === 'zh' ? `正在分析第 ${currentPage} 张，共 ${files.length} 张` : `Analyzing page ${currentPage} of ${files.length}`)
                            : (lang === 'zh' ? '正在分析您的合同...' : 'Analyzing your lease...')}
                        </p>
                        <p className="text-indigo-700 text-sm mt-1">
                          {lang === 'zh'
                            ? '请不要关闭或刷新页面。'
                            : 'Please don\'t close or refresh the page.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div ref={resultsRef}>
              {analysisResult && (
              <div className="mt-8 bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">
                      {lang === 'zh' ? '分析结果' : 'Analysis Results'}
                    </h3>
                    {isSampleReport && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        {lang === 'zh' ? '示例报告' : 'Sample Report'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Printer className="h-5 w-5" />
                    {lang === 'zh' ? '打印' : 'Print'}
                  </button>
                </div>
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                  <p className="text-slate-700">{analysisResult.summary}</p>
                </div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600">
                        {lang === 'zh' ? '风险评分' : 'Risk Score'}
                      </span>
                      <span className={`font-bold ${analysisResult.riskScore >= 70 ? 'text-red-600' :
                          analysisResult.riskScore >= 40 ? 'text-amber-600' :
                            'text-emerald-600'
                        }`}>
                        {analysisResult.riskScore}/100
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${analysisResult.riskScore >= 70 ? 'bg-red-500' :
                            analysisResult.riskScore >= 40 ? 'bg-amber-500' :
                              'bg-emerald-500'
                          }`}
                        style={{ width: `${analysisResult.riskScore}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="font-semibold text-slate-900">
                    {lang === 'zh' ? '关键条款' : 'Key Clauses'}
                  </h4>
                  {groupClausesByRisk(analysisResult.clauses).map(group => (
                    <div key={group.risk}>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 border ${getRiskBadgeStyle(group.risk)} ${getRiskGroupStyle(group.risk)}`}>
                        {group.risk === 'high' && <AlertTriangle className="h-4 w-4" />}
                        {group.risk === 'medium' && <Shield className="h-4 w-4" />}
                        {group.risk === 'low' && <CheckCircle className="h-4 w-4" />}
                        <span className="text-sm font-semibold">{getRiskLabel(group.risk)}</span>
                        <span className="text-xs opacity-70">({group.clauses.length})</span>
                      </div>
                      <div className="space-y-3">
                        {group.clauses.map((clause) => (
                          <div
                            key={clause.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-slate-500 font-medium">
                                {clause.title}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 leading-relaxed">{clause.summary}</p>
                            {clause.original && (
                              <blockquote className="mt-3 pl-3 border-l-2 border-slate-300 text-slate-600 text-sm italic">
                                "{clause.original}"
                              </blockquote>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        </section>
        
        {/* TODO: Comparison table section */}
        {/* TODO: Testimonials section */}
        {/* TODO: Contact section */}
      </main>
      <footer className="py-8 px-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center text-slate-400 text-sm">
          <p>© 2024 TutorBox. {lang === 'zh' ? '保留所有权利' : 'All rights reserved.'}</p>
        </div>
      </footer>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {lang === 'zh' ? '登录' : 'Sign In'}
            </h3>
            <p className="text-slate-600">
              {lang === 'zh' ? '登录功能开发中...' : 'Login coming soon...'}
            </p>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}