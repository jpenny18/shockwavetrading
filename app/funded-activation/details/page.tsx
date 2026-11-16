'use client';

import { Suspense } from 'react';
import ActivationSteps from '../../components/funded-activation/ActivationSteps';
import { ACTIVATE_FUNDED_SIZES, activateFundedPrice } from '../../components/funded-activation/catalogs';

function Details() {
  return (
    <ActivationSteps
      step="details"
      source="activate-funded"
      basePath="/funded-activation"
      orderType="activate-funded"
      sizes={ACTIVATE_FUNDED_SIZES}
      priceFor={activateFundedPrice}
      pendingPath="/funded-activation/pending"
    />
  );
}

export default function ActivateFundedDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Details />
    </Suspense>
  );
}
