import React, { useState, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Wand2,
  Download,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Layers,
  FileCheck
} from 'lucide-react';
import { Role, Platform, ImageReviewResult } from '../../types';
import { apiClient } from '../../services/api';

interface EnhancerViewProps {
  userRole: Role;
  username: string;
  organizationId?: string;
  companyName?: string;
  companyCategory?: string;
  onSendToNewPost?: (content: { title?: string; caption?: string; mediaRef?: string }) => void;
}

export const EnhancerView: React.FC<EnhancerViewProps> = ({
  userRole,
  username,
  organizationId,
  companyName,
  companyCategory,
  onSendToNewPost
}) => {
  // -------------------------------------------------------------
  // Dynamic brand-aware inspiration & sample generator
  // -------------------------------------------------------------
  const compName = companyName || 'BrandLens';
  const cat = (companyCategory || 'Enterprise').toLowerCase();

  const getInspirationIdeas = () => {
    if (cat.includes('cosmetic') || cat.includes('beauty')) {
      return [
        `${compName} frosted glass foundation bottle on natural marble in morning sunlight`,
        'Editorial macro beauty portrait with radiant natural skin finish and subtle glow',
        'Clean beauty artistry shade palette with rich pigments and soft natural textures',
        `${compName} backstage makeup vanity with professional brushes and soft warm illumination`
      ];
    }
    if (cat.includes('education')) {
      return [
        'Modern university lecture amphitheater with engaged students collaborating on digital tablets',
        `${compName} contemporary architectural library with bright natural daylight through large glass windows`,
        'Interactive learning bootcamp workshop with vibrant digital displays and teamwork',
        'Minimalist graduate workspace with diploma, academic books, and sleek laptop'
      ];
    }
    if (cat.includes('healthcare') || cat.includes('medical')) {
      return [
        `${compName} modern serene medical wellness clinic with soft ambient lighting and clean design`,
        'Compassionate healthcare specialist consulting with patient in modern consultation room',
        'Advanced clinical laboratory diagnostics workstation with microscope and clean glassware',
        'Digital healthcare app interface on glass tablet with vital health trends and metrics'
      ];
    }
    if (cat.includes('finance')) {
      return [
        `${compName} architectural executive financial headquarters overlooking modern city skyline at dusk`,
        'Sophisticated wealth management analytics dashboard on ultra-wide glass monitor',
        'Minimalist fintech digital card and encrypted contactless payment interface',
        'Corporate leadership strategy meeting in modern glass boardroom with natural lighting'
      ];
    }
    if (cat.includes('e-commerce') || cat.includes('retail') || cat.includes('art')) {
      return [
        `${compName} curated minimalist product showcase on polished concrete pedestal with soft studio light`,
        'Contemporary lifestyle studio photography with sustainable natural materials and warm daylight',
        'Premium unboxing experience with embossed luxury brand packaging and ribbon',
        'Creative design studio workshop with color swatches, sketches, and artisanal tools'
      ];
    }
    if (cat.includes('server') || cat.includes('hosting')) {
      return [
        `${compName} enterprise server rack cluster with glowing violet and cyan optical conduits`,
        'Ultra-low latency fiber optic network routing globe with dark metallic atmosphere',
        'Enterprise cyber security shield protecting cloud compute infrastructure',
        'Modern hosting dashboard on sleek glass workstation in dark minimalist command center'
      ];
    }
    return [
      `High-end editorial corporate photography representing ${compName} in modern workspace`,
      `Modern architectural headquarters with natural cinematic daylight and sleek minimalist aesthetic`,
      `${compName} executive leadership team collaborating on innovative ${companyCategory || 'business'} solutions`,
      `Sophisticated digital workspace interface displaying verified ${companyCategory || 'enterprise'} performance metrics`
    ];
  };

  const getSampleText = () => {
    if (cat.includes('cosmetic') || cat.includes('beauty')) {
      return `${compName}'s new revolutionary foundation is guaranteed to erase 100% of wrinkles overnight permanently! Order right now for an unbelievable 70% flash sale discount.`;
    }
    if (cat.includes('education')) {
      return `${compName} guarantees 100% placement and $200k starting salary for all students who enroll today! Company-wide policy change: all bootcamps are now 50% off for 24 hours.`;
    }
    if (cat.includes('healthcare')) {
      return `${compName}'s new clinical formula cures all chronic fatigue permanently with zero side effects! Official company announcement: free consultations for everyone tomorrow.`;
    }
    return `${compName}'s new high-performance solutions guarantee 100% zero downtime and infinite scale for all clients. Effective tomorrow, company-wide pricing is slashed by 50%!`;
  };

  // -------------------------------------------------------------
  // Section 1: Text Review & Enhancement
  // -------------------------------------------------------------
  const [textInput, setTextInput] = useState('');
  const [textPlatform, setTextPlatform] = useState<Platform>('LinkedIn');
  const [textRole, setTextRole] = useState<Role>(userRole);
  const [textTone, setTextTone] = useState<string>('executive-professional');
  const [textEnhancing, setTextEnhancing] = useState(false);
  const [textResult, setTextResult] = useState<{
    originalText?: string;
    enhancedText?: string;
    briefExplanation?: string;
    keyImprovements?: string[];
  } | null>(null);
  const [textCopied, setTextCopied] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const handleEnhanceText = async () => {
    if (!textInput.trim()) {
      setTextError('Please enter some text to review and enhance.');
      return;
    }
    setTextError(null);
    setTextEnhancing(true);
    try {
      const res = await apiClient.enhanceText({
        text: textInput,
        role: textRole,
        platform: textPlatform,
        tone: textTone,
        organizationId,
      });

      if (res.success && res.enhancedText) {
        setTextResult({
          originalText: res.originalText || textInput,
          enhancedText: res.enhancedText,
          briefExplanation: res.briefExplanation,
          keyImprovements: res.keyImprovements || [],
        });
      } else {
        setTextError(res.error || 'Failed to enhance text.');
      }
    } catch (err: any) {
      setTextError(err.message || 'An unexpected error occurred during text enhancement.');
    } finally {
      setTextEnhancing(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // Section 2: Image Review (AI Safety & Suitability)
  // -------------------------------------------------------------
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMediaRef, setImageMediaRef] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const [imageResult, setImageResult] = useState<ImageReviewResult | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    setImageError(null);
    setImageFile(file);
    setImageResult(null);

    // Local thumbnail preview
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);

    // Upload to server
    setImageUploading(true);
    try {
      const uploaded = await apiClient.uploadMedia(file);
      setImageMediaRef(uploaded.mediaRef);
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload image for review.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageMediaRef) {
      setImageError('Please select and upload an image first.');
      return;
    }
    setImageError(null);
    setImageAnalyzing(true);
    try {
      const res = await apiClient.checkImage({
        mediaRef: imageMediaRef,
        role: userRole,
        platform: 'LinkedIn',
        organizationId,
      });
      if (res.success && res.data) {
        setImageResult(res.data);
      } else {
        setImageError(res.error || 'Failed to analyze image safety.');
      }
    } catch (err: any) {
      setImageError(err.message || 'Image analysis service error.');
    } finally {
      setImageAnalyzing(false);
    }
  };

  // -------------------------------------------------------------
  // Section 3: Image Generate
  // -------------------------------------------------------------
  const [genPromptInput, setGenPromptInput] = useState('');
  const [genGenerating, setGenGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    prompt?: string;
    generatedPrompt?: string;
    mediaRef?: string;
  } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!genPromptInput.trim()) {
      setGenError('Please enter a prompt to generate an image.');
      return;
    }
    setGenError(null);
    setGenGenerating(true);
    try {
      const res = await apiClient.generateImage({
        prompt: genPromptInput,
        role: userRole,
        platform: 'LinkedIn',
        organizationId,
      });
      if (res.success && res.mediaRef) {
        setGenResult({
          prompt: res.prompt || genPromptInput,
          generatedPrompt: res.generatedPrompt,
          mediaRef: res.mediaRef,
        });
      } else {
        setGenError(res.error || 'Image generation failed. Try a different prompt.');
      }
    } catch (err: any) {
      setGenError(err.message || 'Image generation service error.');
    } finally {
      setGenGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // Section 4: Document Review (Extract Text)
  // -------------------------------------------------------------
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExtracting, setDocExtracting] = useState(false);
  const [docResult, setDocResult] = useState<{
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    text?: string;
    wordCount?: number;
  } | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docCopied, setDocCopied] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    setDocError(null);
    setDocResult(null);
    setDocExtracting(true);

    try {
      const res = await apiClient.extractDocument(file);
      if (res.success && res.text) {
        setDocResult({
          fileName: res.fileName || file.name,
          fileSize: res.fileSize || file.size,
          fileType: res.fileType || file.type,
          text: res.text,
          wordCount: res.wordCount,
        });
      } else {
        setDocError(res.error || 'Could not extract text from this document.');
      }
    } catch (err: any) {
      setDocError(err.message || 'Document processing failed.');
    } finally {
      setDocExtracting(false);
    }
  };

  const handleDownloadDocText = () => {
    if (!docResult?.text) return;
    const blob = new Blob([docResult.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(docResult.fileName || 'extracted-document').replace(/\.[^/.]+$/, '')}-text.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyDocText = () => {
    if (!docResult?.text) return;
    navigator.clipboard.writeText(docResult.text);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2000);
  };

  const handleSendDocToTextReview = () => {
    if (!docResult?.text) return;
    setTextInput(docResult.text);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#a68bff]/15 text-[#a68bff] border border-[#a68bff]/25">
              <Sparkles size={18} />
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-manrope">
              BrandLens AI Enhancer Studio
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 font-manrope">
            Multimodal governance and creative refinement suite — independently scrollable modules for copy, visual safety, synthesis, and document ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Role: <strong className="text-zinc-200">{userRole}</strong></span>
          <span className="text-zinc-600">|</span>
          <span>Org: <strong className="text-zinc-200">{companyName || 'Nova Unlimited'}</strong></span>
        </div>
      </div>

      {/* 2x2 Responsive Grid with scrollable card interiors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ========================================================
            SECTION 1: TEXT REVIEW & ENHANCEMENT
            ======================================================== */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-[580px] shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-md bg-[#a68bff]/15 text-[#a68bff] border border-[#a68bff]/20">
                <FileText size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Text Review & Enhancer</h2>
                <p className="text-[11px] text-zinc-400">Refine copy with role policy and verified SLA benchmarks</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
              Module 01
            </span>
          </div>

          {/* Card Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Tone & Platform select bar */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-mono">TARGET PLATFORM</label>
                <select
                  aria-label="Target Platform"
                  value={textPlatform}
                  onChange={(e) => setTextPlatform(e.target.value as Platform)}
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a68bff]"
                >
                  <option value="LinkedIn">LinkedIn (Professional)</option>
                  <option value="X">X / Twitter (Concise)</option>
                  <option value="Instagram">Instagram (Visual & Story)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-mono">TARGET TONE</label>
                <select
                  aria-label="Target Tone"
                  value={textTone}
                  onChange={(e) => setTextTone(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a68bff]"
                >
                  <option value="executive-professional">Executive & Professional</option>
                  <option value="technical-deep">Technical & Precise</option>
                  <option value="approachable-launch">Launch Announcement</option>
                  <option value="incident-transparent">Incident & Transparency</option>
                </select>
              </div>
            </div>

            {/* Input textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-zinc-300">ENTER TEXT TO REVIEW</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTextInput(getSampleText())}
                    className="text-[10px] text-[#a68bff] hover:underline"
                  >
                    Load Sample
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {textInput.length} chars
                  </span>
                </div>
              </div>
              <textarea
                aria-label="Enter text to review"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste draft copy to review governance, remove unauthorized claims, and enhance tone..."
                className="w-full h-28 bg-zinc-900/60 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#a68bff] transition-colors resize-none font-sans"
              />
            </div>

            {/* Enhance Button */}
            <button
              type="button"
              onClick={handleEnhanceText}
              disabled={textEnhancing || !textInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#a68bff] to-[#7f5af0] text-white font-medium text-xs shadow-lg shadow-[#a68bff]/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {textEnhancing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Enhancing with FreeLLM Governance...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>Enhance Text</span>
                </>
              )}
            </button>

            {textError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{textError}</span>
              </div>
            )}

            {/* Output Enhanced Box */}
            {textResult && (
              <div className="mt-2 space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Check size={14} />
                    Enhanced Result
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(textResult.enhancedText || '')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition-colors"
                      title="Copy enhanced text"
                    >
                      {textCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{textCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onSendToNewPost && (
                      <button
                        type="button"
                        onClick={() => onSendToNewPost({ caption: textResult.enhancedText })}
                        className="px-2 py-1 rounded bg-[#a68bff]/20 hover:bg-[#a68bff]/30 text-[#a68bff] text-[11px] flex items-center gap-1 transition-colors"
                        title="Use in New Post"
                      >
                        <ArrowRight size={12} />
                        <span>Use in Post</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-white/10 text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {textResult.enhancedText}
                </div>

                {textResult.briefExplanation && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400">
                    <strong className="text-zinc-300 block mb-0.5">Rationale:</strong>
                    {textResult.briefExplanation}
                  </div>
                )}

                {textResult.keyImprovements && textResult.keyImprovements.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Key Improvements</span>
                    <ul className="space-y-1">
                      {textResult.keyImprovements.map((imp, idx) => (
                        <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                          <span className="text-[#a68bff] mt-0.5">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            SECTION 2: IMAGE REVIEW (SAFETY & SUITABILITY)
            ======================================================== */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-[580px] shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <ImageIcon size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Image Review & Safety</h2>
                <p className="text-[11px] text-zinc-400">AI safety rating, public posting suitability & brand check</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
              Module 02
            </span>
          </div>

          {/* Card Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Upload Zone */}
            <div>
              <label className="text-[11px] font-mono text-zinc-300 block mb-1.5">UPLOAD IMAGE TO ANALYZE</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="enhancer-image-upload"
              />
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/15 hover:border-[#a68bff]/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer group"
              >
                <Upload size={22} className="text-zinc-400 group-hover:text-[#a68bff] transition-colors" />
                <div className="text-center">
                  <p className="text-xs text-zinc-300 font-medium">Click to select or drop image</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">PNG, JPG, WebP up to 25MB</p>
                </div>
              </div>
            </div>

            {/* Preview & Status */}
            {imagePreviewUrl && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-3">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{imageFile?.name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ''} • {imageUploading ? 'Uploading...' : 'Uploaded'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeImage}
                  disabled={imageUploading || imageAnalyzing || !imageMediaRef}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {imageAnalyzing ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Analyze</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {imageError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{imageError}</span>
              </div>
            )}

            {/* Analysis Result */}
            {imageResult && (
              <div className="mt-2 space-y-3 pt-3 border-t border-white/10">
                {/* Safety Status Pill */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  imageResult.isPublicSafe !== false
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {imageResult.isPublicSafe !== false ? (
                      <ShieldCheck size={20} className="text-emerald-400" />
                    ) : (
                      <ShieldAlert size={20} className="text-rose-400" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {imageResult.isPublicSafe !== false ? 'Safe for Public Posting' : 'Attention Required Before Posting'}
                      </h4>
                      <p className="text-[10px] text-zinc-300 opacity-80">
                        Safety Rating: <span className="font-semibold uppercase">{imageResult.safetyRating || (imageResult.isPublicSafe !== false ? 'safe' : 'unsafe')}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                    imageResult.isPublicSafe !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {imageResult.isPublicSafe !== false ? 'PASS' : 'FLAGGED'}
                  </span>
                </div>

                {/* Critical Issues / Privacy Flag */}
                {imageResult.issues && imageResult.issues.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Security & Privacy Finding</span>
                    </div>
                    {imageResult.issues.map((iss, idx) => (
                      <p key={idx} className="text-[11px] leading-relaxed text-rose-300/90 pl-5">
                        {iss}
                      </p>
                    ))}
                  </div>
                )}

                {/* Brief Analysis */}
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Brief Analysis</span>
                  <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                    {imageResult.briefAnalysis || imageResult.explanation || imageResult.altTextSuggestion || 'Analysis completed.'}
                  </p>
                </div>

                {/* Suggestions */}
                {Boolean((imageResult.suggestions && imageResult.suggestions.length > 0) || imageResult.suggestion) && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Practical Suggestion</span>
                    <ul className="space-y-1">
                      {(imageResult.suggestions && imageResult.suggestions.length > 0
                        ? imageResult.suggestions
                        : imageResult.suggestion
                        ? [imageResult.suggestion]
                        : []
                      ).map((sug, idx) => (
                        <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                          <span className={imageResult.isPublicSafe === false ? 'text-rose-400 mt-0.5' : 'text-emerald-400 mt-0.5'}>
                            {imageResult.isPublicSafe === false ? '!' : '✓'}
                          </span>
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Checklist indicators */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-zinc-400">Brand Relevance:</span>
                    <span className={`font-mono font-medium ${
                      imageResult.brandRelevance?.includes('Prohibited') || imageResult.isPublicSafe === false
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      {imageResult.brandRelevance || 'High'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-zinc-400">Resolution Quality:</span>
                    <span className="font-mono text-emerald-400">{imageResult.resolutionQuality || 'Optimal'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            SECTION 3: IMAGE GENERATE
            ======================================================== */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-[580px] shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                <Wand2 size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Image Generate</h2>
                <p className="text-[11px] text-zinc-400">Synthesize small prompt & generate high-res brand visual</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
              Module 03
            </span>
          </div>

          {/* Card Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Quick Inspiration Pills */}
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block mb-1.5 uppercase">Quick Inspiration Ideas</span>
              <div className="flex flex-wrap gap-1.5">
                {getInspirationIdeas().map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGenPromptInput(idea)}
                    className="text-[10px] px-2 py-1 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/5 transition-all text-left"
                  >
                    + {idea}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-zinc-300">USER PROMPT</label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {genPromptInput.length} chars
                </span>
              </div>
              <textarea
                aria-label="User Prompt"
                value={genPromptInput}
                onChange={(e) => setGenPromptInput(e.target.value)}
                placeholder="Describe the image you want. BrandLens will synthesize an optimal compact prompt for the generator..."
                className="w-full h-24 bg-zinc-900/60 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-colors resize-none font-sans"
              />
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={genGenerating || !genPromptInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {genGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing Prompt & Generating Image...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>Generate Image</span>
                </>
              )}
            </button>

            {genError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            {/* Output Generated Image */}
            {genResult && (
              <div className="mt-2 space-y-3 pt-3 border-t border-white/10">
                {/* Small prompt display */}
                {genResult.generatedPrompt && (
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200">
                    <span className="font-mono text-[10px] text-cyan-400 uppercase block mb-0.5">
                      Synthesized Compact Engine Prompt:
                    </span>
                    <p className="font-mono">{genResult.generatedPrompt}</p>
                  </div>
                )}

                {/* Image Display */}
                {genResult.mediaRef && (
                  <div className="space-y-2">
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black">
                      <img
                        src={genResult.mediaRef}
                        alt={genResult.prompt || 'Generated Brand Asset'}
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                        <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[200px]">
                          {genResult.prompt}
                        </span>
                        <a
                          href={genResult.mediaRef}
                          download="brandlens-generated.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                          title="Open full size"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={genResult.mediaRef}
                        download="brandlens-generated.jpg"
                        className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download size={13} />
                        <span>Download Image</span>
                      </a>
                      {onSendToNewPost && (
                        <button
                          type="button"
                          onClick={() => onSendToNewPost({ mediaRef: genResult.mediaRef })}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ArrowRight size={13} />
                          <span>Use in New Post</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            SECTION 4: DOCUMENT REVIEW (EXTRACT TEXT)
            ======================================================== */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-[580px] shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <FileCheck size={16} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Document Review & Extractor</h2>
                <p className="text-[11px] text-zinc-400">Ingest PDF or DOCX, extract text, and download or review</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
              Module 04
            </span>
          </div>

          {/* Card Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Document Upload Zone */}
            <div>
              <label className="text-[11px] font-mono text-zinc-300 block mb-1.5">UPLOAD DOCUMENT (PDF OR DOCX)</label>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleDocSelect}
                className="hidden"
                id="enhancer-doc-upload"
              />
              <div
                onClick={() => docInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/15 hover:border-amber-400/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer group"
              >
                <Upload size={22} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                <div className="text-center">
                  <p className="text-xs text-zinc-300 font-medium">Click to select or drop document</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Supports PDF (.pdf) and Word (.docx, .doc)</p>
                </div>
              </div>
            </div>

            {/* Document Status */}
            {docExtracting && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Extracting plain text from document...</span>
              </div>
            )}

            {docError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{docError}</span>
              </div>
            )}

            {/* Extracted Text Box */}
            {docResult && docResult.text && (
              <div className="mt-2 space-y-3 pt-3 border-t border-white/10">
                {/* Meta bar */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-white truncate">{docResult.fileName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {docResult.wordCount} words • {docResult.text.length} characters
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyDocText}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition-colors"
                      title="Copy text"
                    >
                      {docCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{docCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDocText}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="Download text file"
                    >
                      <Download size={12} />
                      <span>Download Text</span>
                    </button>
                  </div>
                </div>

                {/* Text Content Box */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 text-xs text-zinc-200 leading-relaxed font-mono max-h-52 overflow-y-auto whitespace-pre-wrap select-all custom-scrollbar">
                  {docResult.text}
                </div>

                {/* Transfer Action */}
                <button
                  type="button"
                  onClick={handleSendDocToTextReview}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-white/5"
                >
                  <ArrowRight size={13} className="text-[#a68bff]" />
                  <span>Send Text to Module 01 (Text Review)</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
