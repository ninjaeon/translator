import "@mantine/core/styles.css";
import {
  Text,
  Stack,
  Textarea,
  TextInput,
  Group,
  Select,
  Box,
  ActionIcon,
  Switch,
  HoverCard,
} from "@mantine/core";
import { useEffect } from "react"; // Import useEffect

import classes from "./ParagraphOptions.module.css";
import {
  IconLayoutGridAdd,
  IconQuestionMark,
  IconTrashX,
} from "@tabler/icons-react";
import useParagraphStore from "../../stores/paragraph";
import useSettingsStore from "../../stores/settings";
import Language, { languageNull } from "../../models/language"; // Import languageNull

export default function ParagraphOptions() {
  // Settings from useSettingsStore (which loads persisted values)
  const settingsStore = useSettingsStore();
  const {
    models,
    languages,
    selectedModel: persistedModel,
    sourceLanguageCode: persistedSourceLangCode,
    targetLanguageCode: persistedTargetLangCode,
    useRefinement: persistedUseRefinement,
  } = settingsStore;

  // State and setters from useParagraphStore
  const paragraphStore = useParagraphStore();
  const {
    request,
    model: currentModel,
    useRefinement: currentUseRefinement,
  } = paragraphStore;
  const {
    setModel,
    setSourceLang,
    setTargetLang,
    setUseRefinement,
    setContext, // Keep existing ones
    addExample,
    removeExampleAt,
    modifyExampleAt,
  } = paragraphStore;

  // Effect to initialize paragraph store from persisted settings
  useEffect(() => {
    // Initialize model
    if (persistedModel && persistedModel !== currentModel) {
      setModel(persistedModel);
    }

    // Initialize source language
    if (
      languages.length > 0 &&
      persistedSourceLangCode &&
      persistedSourceLangCode !== request.sourceLang.code
    ) {
      const lang = languages.find((l) => l.code === persistedSourceLangCode);
      setSourceLang(lang ?? languageNull);
    } else if (!persistedSourceLangCode && request.sourceLang !== languageNull) {
      setSourceLang(languageNull); // Reset if persisted code is null
    }

    // Initialize target language
    if (
      languages.length > 0 &&
      persistedTargetLangCode &&
      persistedTargetLangCode !== request.targetLang.code
    ) {
      const lang = languages.find((l) => l.code === persistedTargetLangCode);
      setTargetLang(lang ?? languageNull);
    } else if (!persistedTargetLangCode && request.targetLang !== languageNull) {
      setTargetLang(languageNull); // Reset if persisted code is null
    }

    // Initialize use refinement
    // Check if currentUseRefinement is different from persisted to avoid loop if already set by store's own init
    if (persistedUseRefinement !== currentUseRefinement) {
       setUseRefinement(persistedUseRefinement);
    }

  }, [
    persistedModel,
    persistedSourceLangCode,
    persistedTargetLangCode,
    persistedUseRefinement,
    languages, // Important dependency for language lookup
    setModel,
    setSourceLang,
    setTargetLang,
    setUseRefinement,
    request.sourceLang, // To re-run if sourceLang object changes by other means
    request.targetLang, // To re-run if targetLang object changes by other means
    currentModel,
    currentUseRefinement,
  ]);
  // const setContext = useParagraphStore((state) => state.setContext); // Removed duplicate
  // const addExample = useParagraphStore((state) => state.addExample); // Removed duplicate
  // const removeExampleAt = useParagraphStore((state) => state.removeExampleAt); // Removed duplicate
  // const modifyExampleAt = useParagraphStore((state) => state.modifyExampleAt); // Removed duplicate

  const languageOptions = languages.map((e) => e.endonym);

  return (
    <>
      <Group justify="space-between">
        <Text>
          Model
          <Text c="red" span inherit>
            *
          </Text>
        </Text>
        <Select data={models} value={currentModel} onChange={setModel}></Select>
      </Group>

      <Group justify="space-between">
        <Text pr="md">
          Languages
          <Text c="red" span inherit>
            *
          </Text>
        </Text>
        <Group>
          <Select
            data={languageOptions}
            value={request.sourceLang?.endonym || null}
            w="7rem"
            searchable
            onChange={(value) => {
              const lang = languages.find((e) => e.endonym === value);
              setSourceLang(lang ?? languageNull);
            }}
          ></Select>
          <Text>to</Text>
          <Select
            data={languageOptions}
            value={request.targetLang?.endonym || null}
            w="7rem"
            searchable
            onChange={(value) => {
              const lang = languages.find((e) => e.endonym === value);
              setTargetLang(lang ?? languageNull);
            }}
          ></Select>
        </Group>
      </Group>

      <Group justify="space-between">
        <Group>
          <Text>Refine results</Text>
          <HoverCard width={280} shadow="md">
            <HoverCard.Target>
              <IconQuestionMark>Hover to reveal the card</IconQuestionMark>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text size="sm">
                Analyze and edit the raw translation results. Takes
                approximately three times longer.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
        </Group>
        <Switch
          checked={useRefinement}
          onChange={(event) => setUseRefinement(event.currentTarget.checked)}
        />
      </Group>

      <Stack>
        <Text>Context</Text>
        <Textarea
          placeholder="Input context to enhance translation quality"
          autosize
          minRows={4}
          maxRows={8}
          onChange={(event) => setContext(event.currentTarget.value)}
        ></Textarea>
      </Stack>

      <Stack>
        <Text>Examples</Text>
        {request.examples.map((_, i) => (
          <OptionsExample
            key={`${i}`}
            description={`Pair ${i + 1}`}
            lang1={request.sourceLang}
            lang2={request.targetLang}
            onText1Change={(text) => modifyExampleAt(i, text, undefined)}
            onText2Change={(text) => modifyExampleAt(i, undefined, text)}
            onRemove={() => removeExampleAt(i)}
          ></OptionsExample>
        ))}
        <ActionIcon variant="subtle" size="sm" w="100%" onClick={addExample}>
          <IconLayoutGridAdd></IconLayoutGridAdd>
        </ActionIcon>
      </Stack>
    </>
  );
}

interface OptionsExampleProps {
  description: string;
  lang1: Language;
  lang2: Language;
  onRemove: () => void;
  onText1Change: (text: string) => void;
  onText2Change: (text: string) => void;
}

function OptionsExample({
  description,
  lang1,
  lang2,
  onRemove,
  onText1Change,
  onText2Change,
}: OptionsExampleProps) {
  const topSection = <Text size="xs">{lang1.code}</Text>;
  const bottomSection = <Text size="xs">{lang2.code}</Text>;

  return (
    <Box>
      <Group justify="space-between" pb="xs">
        <Text size="xs">{description}</Text>
        <ActionIcon variant="subtle" size="sm" onClick={onRemove}>
          <IconTrashX width="70%"></IconTrashX>
        </ActionIcon>
      </Group>
      <TextInput
        classNames={{ input: classes["input-top"] }}
        leftSection={topSection}
        onChange={(e) => onText1Change(e.currentTarget.value)}
      ></TextInput>
      <TextInput
        classNames={{ input: classes["input-bottom"] }}
        leftSection={bottomSection}
        onChange={(e) => onText2Change(e.currentTarget.value)}
      ></TextInput>
    </Box>
  );
}
