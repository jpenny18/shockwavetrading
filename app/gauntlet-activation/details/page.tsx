'use client';

import { Suspense } from 'react';
import ActivationSteps from '../../components/funded-activation/ActivationSteps';
import { GAUNTLET_ACTIVATION_SIZES, gauntletActivationPrice } from '../../components/funded-activation/catalogs';

function Details() {
  return (
    <ActivationSteps
      step="details"
      source="gauntlet-activation"
      basePath="/gauntlet-activation"
      orderType="gauntlet-activation"
      sizes={GAUNTLET_ACTIVATION_SIZES}
      priceFor={gauntletActivationPrice}
      pendingPath="/gauntlet-activation/pending"
    />
  );
}

export default function GauntletActivationDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Details />
    </Suspense>
  );
}
