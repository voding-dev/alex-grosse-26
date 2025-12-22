import Image from "next/image";

export type PitchDeckPreviewProps = {
  title: string;
  coverDescription?: string;
  preparedFor?: string;
  preparedDate?: string;
  coverMediaUrls?: string[];
  scopeOfWork?: string;
  preProduction?: string;
  production?: string;
  postProduction?: string;
  imageryMediaUrls?: string[];
  estimate?: string;
  galleryMediaUrls?: string[]; // New: gallery slide
};

export function PitchDeckPreview(props: PitchDeckPreviewProps) {
  const {
    title,
    coverDescription,
    preparedFor,
    preparedDate,
    coverMediaUrls = [],
    scopeOfWork,
    preProduction,
    production,
    postProduction,
    imageryMediaUrls = [],
    estimate,
    galleryMediaUrls = [],
  } = props;

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Page - Hero Section Style */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        {/* Media Collage Background - Grid */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 border border-gray-700/30"
              style={{
                backgroundImage: coverMediaUrls[i]
                  ? 'url(' + coverMediaUrls[i] + ')'
                  : 'url(' + 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQ0NDQ0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM3Nzc3NzciIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSB7aSsxfTwvdGV4dD48L3N2Zz4=' + ')',
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="mb-6 flex items-center justify-center">
            <Image
              src="/ag-wordmark-white.svg"
              alt="ALEX GROSSE"
              width={600}
              height={150}
              className="h-20 w-auto object-contain sm:h-28 md:h-36"
              loading="eager"
            />
          </div>
          <h1 className="mb-4 text-center text-4xl font-black uppercase text-white sm:text-5xl md:text-6xl lg:text-7xl" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            {title || "PROJECT TITLE"}
          </h1>
          {coverDescription && (
            <p className="max-w-2xl px-4 text-center text-base font-medium text-white/90 sm:text-lg md:text-xl">
              {coverDescription}
            </p>
          )}
          {(preparedFor || preparedDate) && (
            <div className="mt-12 space-y-2 text-center">
              {preparedFor && (
                <p className="text-sm font-medium uppercase text-accent sm:text-base">
                  Prepared for: {preparedFor}
                </p>
              )}
              {preparedDate && (
                <p className="text-sm text-white/80 sm:text-base">Date: {preparedDate}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Scope of Work Section */}
      {scopeOfWork && (
        <section className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden">
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                SCOPE OF WORK
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="space-y-6 text-black">
                  <p className="text-base leading-relaxed sm:text-lg whitespace-pre-line">{scopeOfWork}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Production Breakdown */}
      {(preProduction || production || postProduction) && (
        <section className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden">
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                PRODUCTION BREAKDOWN
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
                {preProduction && (
                  <div>
                    <h3 className="mb-4 text-2xl font-black uppercase tracking-wide text-black sm:text-3xl" style={{ fontWeight: '900' }}>PRE-PRODUCTION</h3>
                    <p className="text-base leading-relaxed text-black sm:text-lg whitespace-pre-line">{preProduction}</p>
                  </div>
                )}
                {production && (
                  <div>
                    <h3 className="mb-4 text-2xl font-black uppercase tracking-wide text-black sm:text-3xl" style={{ fontWeight: '900' }}>PRODUCTION</h3>
                    <p className="text-base leading-relaxed text-black sm:text-lg whitespace-pre-line">{production}</p>
                  </div>
                )}
                {postProduction && (
                  <div>
                    <h3 className="mb-4 text-2xl font-black uppercase tracking-wide text-black sm:text-3xl" style={{ fontWeight: '900' }}>POST-PRODUCTION</h3>
                    <p className="text-base leading-relaxed text-black sm:text-lg whitespace-pre-line">{postProduction}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Relevant Imagery */}
      {(imageryMediaUrls?.length || 0) > 0 && (
        <section className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden">
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                RELEVANT IMAGERY
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(imageryMediaUrls || []).slice(0, 6).map((url, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden bg-gray-200">
                      <div className="h-full w-full" style={{ backgroundImage: 'url(' + url + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery section intentionally removed in builder per latest requirements */}

      {/* Estimate */}
      {estimate && (
        <section className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden">
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                ESTIMATE
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="space-y-6 text-base leading-relaxed text-black sm:text-lg whitespace-pre-line">
                  <p>{estimate}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
