import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useGlobalConfig(configKey) {
  return useQuery({
    queryKey: ['globalConfig', configKey],
    queryFn: async () => {
      const records = await base44.entities.GlobalAppConfig.filter({ config_key: configKey });
      return records[0] || null;
    },
    staleTime: 5000,
  });
}

export function useSaveGlobalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ configKey, configValue }) => {
      const records = await base44.entities.GlobalAppConfig.filter({ config_key: configKey });
      if (records[0]) {
        return base44.entities.GlobalAppConfig.update(records[0].id, { config_value: configValue });
      } else {
        return base44.entities.GlobalAppConfig.create({ config_key: configKey, config_value: configValue });
      }
    },
    onSuccess: (_, { configKey }) => {
      queryClient.invalidateQueries({ queryKey: ['globalConfig', configKey] });
    },
  });
}