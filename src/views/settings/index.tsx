import { Stack, Switch, Title } from "@mantine/core";
import useSettingsStore from "../../stores/settings";

export default function SettingsPage() {
  const showWindowOnStartup = useSettingsStore(
    (state) => state.showWindowOnStartup,
  );
  const toggleShowWindowOnStartup = useSettingsStore(
    (state) => state.toggleShowWindowOnStartup,
  );
  const hideToSystemTray = useSettingsStore(
    (state) => state.hideToSystemTray,
  );
  const toggleHideToSystemTray = useSettingsStore(
    (state) => state.toggleHideToSystemTray,
  );

  return (
    <Stack>
      <Title order={2}>Application Settings</Title>
      <Switch
        checked={showWindowOnStartup}
        onChange={toggleShowWindowOnStartup}
        label="Show Window on Startup"
        description="If disabled, the application will start minimized to the system tray."
      />
      <Switch
        checked={hideToSystemTray}
        onChange={toggleHideToSystemTray}
        label="Hide to System Tray"
        description="If enabled, closing the window will hide it to the system tray instead of quitting."
      />
    </Stack>
  );
}
