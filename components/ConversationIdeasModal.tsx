import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Drawer, Button } from 'antd';
import { languageOptions, useLanguage } from './LanguageManager';
import { useCallManager } from './CallManager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import styled from 'styled-components';
import ConversionIdea from './ConversionIdea'; // Proper import

const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    padding: 20px;
    background-color: rgb(17 24 39);
  }
  .ant-drawer-header {
    background-color: rgb(17 24 39);
    border-bottom: none;
  }
  .ant-drawer-title {
    color: white;
    text-align: center;
  }
  .ant-drawer-close {
    color: white;
  }
`;

export default function ConversationIdeasModal() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { t } = useTranslation();
  const { selectedLanguage } = useLanguage();
  const { handleSend } = useCallManager();

  // Fixed: Proper onSelect handler
  const handleIdeaSelect = (idea: string) => {
    if (typeof handleSend === 'function') {
      handleSend(idea);
    }
    setDrawerVisible(false);
  };

  return (
    <div className="flex mt-1 justify-center md:hidden items-center">
      <Button 
        type="primary" 
        onClick={() => setDrawerVisible(true)}
        aria-label="Open conversation ideas"
      >
        <FontAwesomeIcon
          icon={faMessage}
          style={{ color: 'black', fontSize: '18px' }}
        />
      </Button>

      <StyledDrawer
        title={t('conversation.idea')}
        placement="bottom"
        height="55%"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        destroyOnClose
      >
        {/* Fixed: Proper onSelect prop passing */}
        <ConversionIdea onSelect={handleIdeaSelect} />
      </StyledDrawer>
    </div>
  );
}