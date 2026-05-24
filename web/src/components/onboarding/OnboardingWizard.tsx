import React, { useState, useEffect } from 'react';
import { Modal, Steps, Button, Typography, Result } from 'antd';
import { useAuthStore } from '@/store/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axios-instance';

const { Title, Paragraph } = Typography;

export default function OnboardingWizard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Query onboarding status
  const { data, isLoading } = useQuery({
    queryKey: ['onboardingStatus', user?.id],
    queryFn: async () => {
      const res = await axiosInstance.get('/onboarding/status');
      return res.data.data; // { isComplete: boolean }
    },
    enabled: !!user,
  });

  // Mutation to mark onboarding complete
  const { mutate: completeOnboarding, isPending } = useMutation({
    mutationFn: async () => {
      await axiosInstance.patch('/onboarding/complete');
    },
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
    },
  });

  useEffect(() => {
    if (data && !data.isComplete && !isLoading) {
      setIsModalOpen(true);
    }
  }, [data, isLoading]);

  const steps = [
    {
      title: 'Welcome',
      content: (
        <div className="text-center py-8">
          <Title level={3}>Welcome to FieldForce Pro!</Title>
          <Paragraph>
            Let's get you set up to manage your field operations efficiently.
            This quick guide will help you configure your account.
          </Paragraph>
        </div>
      ),
    },
    {
      title: 'Profile Setup',
      content: (
        <div className="py-8">
          <Title level={4}>Complete Your Profile</Title>
          <Paragraph>
            Make sure your contact information is up to date in the Settings tab.
            This helps your team stay in touch.
          </Paragraph>
        </div>
      ),
    },
    {
      title: 'Ready',
      content: (
        <Result
          status="success"
          title="All Set!"
          subTitle="You are now ready to explore FieldForce Pro."
        />
      ),
    },
  ];

  if (!isModalOpen) return null;

  return (
    <Modal
      title="Setup Guide"
      open={isModalOpen}
      closable={false}
      maskClosable={false}
      footer={null}
      width={600}
    >
      <div className="mb-6 mt-4">
        <Steps current={currentStep} items={steps.map((s) => ({ title: s.title }))} />
      </div>
      <div className="min-h-[150px]">{steps[currentStep].content}</div>
      <div className="mt-8 flex justify-end gap-3">
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep((c) => c - 1)}>Back</Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrentStep((c) => c + 1)}>
            Next
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button type="primary" loading={isPending} onClick={() => completeOnboarding()}>
            Finish Setup
          </Button>
        )}
      </div>
    </Modal>
  );
}
