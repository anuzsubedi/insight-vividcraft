import { Button, Text, VStack, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { authService } from "../services/authService";

function HealthCheck() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await authService.checkHealth();
      setStatus(response);
      toast({
        title: "SERVER STATUS",
        description: "SERVER IS RUNNING!",
        status: "success",
        duration: 3000,
        variant: "solid",
      });
    } catch (error) {
      toast({
        title: "SERVER STATUS",
        description:
          error.response?.data?.message || "SERVER IS NOT RESPONDING",
        status: "error",
        duration: 3000,
        variant: "solid",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={4}>
      <Button onClick={checkHealth} isLoading={isLoading} variant="solid">
        Check Server Health
      </Button>
      {status && (
        <Text fontSize="lg" color="accent.100">
          Status: {status.status} | Uptime: {Math.floor(status.uptime)}s
        </Text>
      )}
    </VStack>
  );
}

export default HealthCheck;
