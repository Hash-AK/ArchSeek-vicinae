// various import
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
export default function ArchSeek(){
    return(
        <List>
            <List.Item title="Test" icon="Arch_Linux_logo" actions={
                <ActionPanel>
                    <Action.CopyToClipboard title="Copy" content="hello world"/>
                </ActionPanel>
            }/>
        </List>
    )
}