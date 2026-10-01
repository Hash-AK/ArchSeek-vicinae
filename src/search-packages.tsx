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
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    let selectedPackage
    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
            <List.Item title="burp"/>
            )}
        </List>
    );
}